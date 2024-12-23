/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useEffect,
  useRef,
  useState,
  type Reducer,
  type ReducerState,
  type ReducerAction,
} from 'react';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { fetchStream } from './fetch_stream';
import { stringReducer, type StringReducer } from './string_reducer';
import { DATA_THROTTLE_MS } from './constants';

// This pattern with a dual ternary allows us to default to StringReducer
// and if a custom reducer is supplied fall back to that one instead.
// The complexity in here allows us to create a simpler API surface where
// these generics can be infered from the arguments and don't have to be
// supplied additionally. Note on the use of `any`: `Reducer<any, any>`
// is used to match the type definition in React itself.
type CustomReducer<T> = T extends StringReducer
  ? StringReducer
  : T extends Reducer<any, any>
  ? T
  : never;

// Wrapped reducer options in the format they need to be passed in as arguments.
interface FetchStreamCustomReducer<T> {
  reducer: CustomReducer<T>;
  initialState: ReducerState<CustomReducer<T>>;
}

// Type guard for custom reducer hook argument
function isReducerOptions<T>(arg: unknown): arg is CustomReducer<T> {
  return isPopulatedObject(arg, ['reducer', 'initialState']);
}

/**
 * Custom hook to receive streaming data.
 *
 * Note on the use of `any`:
 * The generic `R` extends from `Reducer<any, any>`
 * to match the definition in React itself.
 *
 * @param http Kibana HTTP client.
 * @param endpoint API endpoint including Kibana base path.
 * @param apiVersion Optional API version.
 * @param body Optional API request body.
 * @param customReducer Optional custom reducer and initial state.
 * @param headers Optional headers.
 * @returns An object with streaming data and methods to act on the stream.
 */
export function useFetchStream<B extends object, R extends Reducer<any, any>>(
  http: HttpSetup,
  endpoint: string,
  apiVersion?: string,
  body?: B,
  customReducer?: FetchStreamCustomReducer<R>,
  headers?: HttpFetchOptions['headers']
) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const reducerWithFallback = isReducerOptions(customReducer)
    ? customReducer
    : ({ reducer: stringReducer, initialState: '' } as FetchStreamCustomReducer<R>);

  // We used `useReducer` in previous iterations of this hook, but it caused
  // a lot of unnecessary re-renders even in combination with `useThrottle`.
  // We're now using `dataRef` to allow updates outside of the render cycle.
  // When the stream is running, we'll update `data` with the `dataRef` value
  // periodically. This will get simpler with React 18 where we
  // can make use of `useDeferredValue`.
  const [data, setData] = useState(reducerWithFallback.initialState);
  const dataRef = useRef(reducerWithFallback.initialState);

  // This effect is used to throttle the data updates while the stream is running.
  // It will update the `data` state with the current `dataRef` value every 100ms.
  useEffect(() => {
    // We cannot check against `isRunning` in the `setTimeout` callback, because
    // we would check against a stale value. Instead, we use a mutable
    // object to keep track of the current state of the effect.
    const effectState = { isActive: true };

    if (isRunning) {
      setData(dataRef.current);

      function updateData() {
        setTimeout(() => {
          setData(dataRef.current);
          if (effectState.isActive) {
            updateData();
          }
        }, DATA_THROTTLE_MS);
      }

      updateData();
    }

    return () => {
      effectState.isActive = false;
    };
  }, [isRunning]);

  const abortCtrl = useRef(new AbortController());

  const addError = (error: string) => {
    setErrors((prevErrors) => [...prevErrors, error]);
  };

  const start = async () => {
    if (isRunning) {
      addError('Instant restart while running not supported yet.');
      return;
    }

    setErrors([]);
    setIsRunning(true);
    setIsCancelled(false);

    abortCtrl.current = new AbortController();

    for await (const [fetchStreamError, action] of fetchStream<B, CustomReducer<R>>(
      http,
      endpoint,
      apiVersion,
      abortCtrl,
      body,
      customReducer !== undefined,
      headers
    )) {
      if (fetchStreamError !== null) {
        addError(fetchStreamError);
      } else if (action) {
        dataRef.current = reducerWithFallback.reducer(dataRef.current, action) as ReducerState<
          CustomReducer<R>
        >;
      }
    }

    setIsRunning(false);
  };

  // This custom dispatch function allows us to update the `dataRef` value and will
  // then trigger an update of `data` right away as we don't want to have the
  // throttling in place for these types of updates.
  const dispatch = (action: ReducerAction<FetchStreamCustomReducer<R>['reducer']>) => {
    dataRef.current = reducerWithFallback.reducer(dataRef.current, action) as ReducerState<
      CustomReducer<R>
    >;
    setData(dataRef.current);
  };

  const cancel = () => {
    abortCtrl.current.abort();
    setIsCancelled(true);
    setIsRunning(false);
  };

  // If components using this custom hook get unmounted, cancel any ongoing request.
  useEffect(() => {
    return () => abortCtrl.current.abort();
  }, []);

  return {
    cancel,
    // To avoid a race condition where the stream already ended but the throttling would
    // yet have to trigger another update within the interval, we'll return
    // the unthrottled data once the stream is complete.
    data: isRunning ? data : dataRef.current,
    dispatch,
    errors,
    isCancelled,
    isRunning,
    start,
  };
}
