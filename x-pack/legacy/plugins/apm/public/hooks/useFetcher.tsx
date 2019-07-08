/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState, useMemo } from 'react';
import { LoadingIndicatorContext } from '../context/LoadingIndicatorContext';
import { useComponentId } from './useComponentId';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

export function useFetcher<Response>(
  fn: () => Promise<Response> | undefined,
  effectKey: any[],
  options: { preservePreviousResponse?: boolean } = {}
) {
  const { preservePreviousResponse = true } = options;
  const id = useComponentId();
  const { dispatchStatus } = useContext(LoadingIndicatorContext);
  const [result, setResult] = useState<{
    data?: Response;
    status?: FETCH_STATUS;
    error?: Error;
  }>({});
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    let didCancel = false;

    async function doFetch() {
      const promise = fn();
      if (!promise) {
        return;
      }

      dispatchStatus({ id, isLoading: true });

      setResult({
        data: preservePreviousResponse ? result.data : undefined, // preserve data from previous state while loading next state
        status: FETCH_STATUS.LOADING,
        error: undefined
      });

      try {
        const data = await promise;
        if (!didCancel) {
          dispatchStatus({ id, isLoading: false });
          setResult({
            data,
            status: FETCH_STATUS.SUCCESS,
            error: undefined
          });
        }
      } catch (e) {
        if (!didCancel) {
          dispatchStatus({ id, isLoading: false });
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: e
          });
        }
      }
    }

    doFetch();

    return () => {
      dispatchStatus({ id, isLoading: false });
      didCancel = true;
    };
  }, [...effectKey, counter]);

  return useMemo(
    () => ({
      ...result,
      refresh: () => {
        // this will invalidate the effectKey and will result in a new request
        setCounter(counter + 1);
      }
    }),
    [result]
  );
}
