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

import type { HttpSetup } from '@kbn/core/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { fetchStream } from './fetch_stream';
import { stringReducer, type StringReducer } from './string_reducer';

type CustomReducer<T> = T extends StringReducer
  ? StringReducer
  : T extends Reducer<any, any>
  ? T
  : never;

interface FetchStreamOptions<T> {
  /**
   * Custom reducer
   */
  reducer: CustomReducer<T>;
  /**
   * Initial state
   */
  initialState: ReducerState<CustomReducer<T>>;
}

function isOptions<T>(arg: unknown): arg is CustomReducer<T> {
  return isPopulatedObject(arg, ['reducer', 'initialState']);
}

/**
 * Custom hook to receive streaming data.
 *
 * @param http Kibana HTTP client.
 * @param endpoint API endpoint including Kibana base path.
 * @param apiVersion Optional API version.
 * @param body Optional API request body.
 * @param options Optional custom reducer and initial state.
 * @returns An object with streaming data and methods to act on the stream.
 */
export function useFetchStream<B extends object, R extends Reducer<any, any>>(
  http: HttpSetup,
  endpoint: string,
  apiVersion?: string,
  body?: B,
  options?: FetchStreamOptions<R>
) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const optionsWithFallback = isOptions(options)
    ? options
    : ({ reducer: stringReducer, initialState: '' } as FetchStreamOptions<R>);

  const [data, dispatch] = useReducer(
    optionsWithFallback.reducer,
    optionsWithFallback.initialState
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
      options !== undefined
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
    data: dataThrottled,
    dispatch,
    errors,
    isCancelled,
    isRunning,
    start,
  };
}
