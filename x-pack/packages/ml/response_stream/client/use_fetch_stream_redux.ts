/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { batch } from 'react-redux';

import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';

import { fetchStream } from './fetch_stream';

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
export function useFetchStreamRedux<B extends object>(
  http: HttpSetup,
  endpoint: string,
  dispatch: any,
  apiVersion?: string,
  body?: B,
  headers?: HttpFetchOptions['headers']
) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

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

    for await (const [fetchStreamError, actions] of fetchStream(
      http,
      endpoint,
      apiVersion,
      abortCtrl,
      body,
      true,
      headers
    )) {
      if (fetchStreamError !== null) {
        addError(fetchStreamError);
      } else if (Array.isArray(actions) && actions.length > 0) {
        batch(() => {
          for (const action of actions) {
            dispatch(action);
          }
        });
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
    errors,
    isCancelled,
    isRunning,
    start,
  };
}
