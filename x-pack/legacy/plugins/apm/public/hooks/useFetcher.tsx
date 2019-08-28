/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { toastNotifications } from 'ui/notify';
import { idx } from '@kbn/elastic-idx';
import { i18n } from '@kbn/i18n';
import { LoadingIndicatorContext } from '../context/LoadingIndicatorContext';
import { useComponentId } from './useComponentId';
import { KFetchError } from '../../../../../../src/legacy/ui/public/kfetch/kfetch_error';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

type Fetcher = (...args: any[]) => any;
type GetReturn<TFetcher extends Fetcher> = Exclude<
  ReturnType<TFetcher>,
  undefined
> extends Promise<infer TReturn>
  ? TReturn
  : ReturnType<TFetcher>;

export function useFetcher<TFetcher extends Fetcher>(
  fn: TFetcher,
  fnDeps: any[],
  options: { preservePreviousResponse?: boolean } = {}
) {
  const { preservePreviousResponse = true } = options;
  const id = useComponentId();
  const { dispatchStatus } = useContext(LoadingIndicatorContext);
  const [result, setResult] = useState<{
    data?: GetReturn<TFetcher>;
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

      setResult(prevResult => ({
        data: preservePreviousResponse ? prevResult.data : undefined, // preserve data from previous state while loading next state
        status: FETCH_STATUS.LOADING,
        error: undefined
      }));

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
        const err = e as KFetchError;
        if (!didCancel) {
          toastNotifications.addWarning({
            title: i18n.translate('xpack.apm.fetcher.error.title', {
              defaultMessage: `Error while fetching resource`
            }),
            text: (
              <div>
                <h5>
                  {i18n.translate('xpack.apm.fetcher.error.status', {
                    defaultMessage: `Error`
                  })}
                </h5>
                {idx(err.res, r => r.statusText)} ({idx(err.res, r => r.status)}
                )
                <h5>
                  {i18n.translate('xpack.apm.fetcher.error.url', {
                    defaultMessage: `URL`
                  })}
                </h5>
                {idx(err.res, r => r.url)}
              </div>
            )
          });
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
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    counter,
    id,
    preservePreviousResponse,
    dispatchStatus,
    ...fnDeps
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  return useMemo(
    () => ({
      ...result,
      refresh: () => {
        // this will invalidate the deps to `useEffect` and will result in a new request
        setCounter(count => count + 1);
      }
    }),
    [result]
  );
}
