import { DependencyList, useCallback, useState, useRef } from 'react';
import useMountedState from './useMountedState';
import { FnReturningPromise, PromiseType } from './util';

export interface AsyncStateLoading {
  loading: true;
}
export interface AsyncStateError {
  loading: false;
  error: Error;
}

export interface AsyncStateValue<T> {
  loading: false;
  value: T;
}

export type AsyncState<T> = AsyncStateLoading | AsyncStateError | AsyncStateValue<T>;

export function isAsyncStateError<T>(state: AsyncState<T>): state is AsyncStateError {
  return !state.loading && state.hasOwnProperty("error");
}

export function isAsyncStateValue<T>(state: AsyncState<T>): state is AsyncStateError {
  return !state.loading && state.hasOwnProperty("value");
}

type StateFromFnReturningPromise<T extends FnReturningPromise> = AsyncState<PromiseType<ReturnType<T>>>;

export type AsyncFnReturn<T extends FnReturningPromise = FnReturningPromise> = [StateFromFnReturningPromise<T>, T];

export default function useAsyncFn<T extends FnReturningPromise>(
  fn: T,
  deps: DependencyList = [],
  initialState: StateFromFnReturningPromise<T> = { loading: true }
): AsyncFnReturn<T> {
  const lastCallId = useRef(0);
  const isMounted = useMountedState();
  const [state, set] = useState<StateFromFnReturningPromise<T>>(initialState);

  const callback = useCallback((...args: Parameters<T>): ReturnType<T> => {
    const callId = ++lastCallId.current;
    set((prevState) => ({ ...prevState, loading: true }));

    return fn(...args).then(
      (value) => {
        isMounted() && callId === lastCallId.current && set({ value, loading: false });

        return value;
      },
      (error) => {
        isMounted() && callId === lastCallId.current && set({ error, loading: false });

        return error;
      }
    ) as ReturnType<T>;
  }, deps);

  return [state, (callback as unknown) as T];
}
