/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type Reducer,
  type ReducerAction,
  type ReducerState,
} from 'react';
import useThrottle from 'react-use/lib/useThrottle';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { fetchStream } from './fetch_stream';
import { stringReducer, type StringReducer } from './string_reducer';

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

  const [data, dispatch] = useReducer(
    reducerWithFallback.reducer,
    reducerWithFallback.initialState
  );
  const dataThrottled = useThrottle(data, 100);

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

    for await (const [fetchStreamError, actions] of fetchStream<B, CustomReducer<R>>(
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
      } else if (Array.isArray(actions) && actions.length > 0) {
        dispatch(actions as ReducerAction<CustomReducer<R>>);
      }
    }

    setIsRunning(false);
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
    // To avoid a race condition where the stream already ended but `useThrottle` would
    // yet have to trigger another update within the throttling interval, we'll return
    // the unthrottled data once the stream is complete.
    data: isRunning ? dataThrottled : data,
    dispatch,
    errors,
    isCancelled,
    isRunning,
    start,
  };
}
