/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TimeState } from '@kbn/es-query';
import type { AbortableAsyncState } from '@kbn/react-hooks';
import { useAbortableAsync } from '@kbn/react-hooks';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { omit } from 'lodash';
import { useEffect, useRef } from 'react';
import { useFetchErrorToast } from './use_fetch_error_toast';
import { useTimefilter } from './use_timefilter';

interface StreamsAppFetchOptions {
  withTimeRange?: boolean;
  withRefresh?: boolean;
  disableToastOnError?: boolean;
}

interface DefaultStreamsAppFetchOptions {
  withTimeRange: false;
  withRefresh: false;
  disableToastOnError: false;
}

type ParametersFromOptions<TOptions extends StreamsAppFetchOptions | undefined> = {
  signal: AbortSignal;
} & (TOptions extends { withTimeRange: true } ? { timeState: TimeState } : {});

export function useStreamsAppFetch<
  T,
  TOptions extends StreamsAppFetchOptions | undefined = DefaultStreamsAppFetchOptions
>(
  callback: ({}: ParametersFromOptions<TOptions>) => T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[],
  options?: TOptions
): AbortableAsyncState<T> {
  const { disableToastOnError = false, withRefresh = false, withTimeRange = false } = options || {};

  const { timeState, timeState$ } = useTimefilter();
  const showFetchErrorToast = useFetchErrorToast();

  const onError = (error: Error) => {
    if (!disableToastOnError && !isRequestAbortedError(error)) {
      showFetchErrorToast(error);

      // log to console to get the actual stack trace
      // eslint-disable-next-line no-console
      console.log(error);
    }
  };

  const optionsForHook = {
    ...omit(options, 'disableToastOnError', 'withTimeRange'),
    onError,
  };

  const timeStateRef = useRef<TimeState>();

  timeStateRef.current = timeState;

  const state = useAbortableAsync<T>(
    ({ signal }) => {
      const parameters = {
        signal,
        ...(withTimeRange ? { timeState: timeStateRef.current } : {}),
      } as ParametersFromOptions<TOptions>;

      return callback(parameters);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
    optionsForHook
  );

  const refreshRef = useRef(state.refresh);
  refreshRef.current = state.refresh;

  useEffect(() => {
    const subscription = timeState$.subscribe({
      next: ({ kind }) => {
        const shouldRefresh =
          (withTimeRange && kind === 'shift') || (withRefresh && kind !== 'initial');

        if (shouldRefresh) {
          refreshRef.current();
        }
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [timeState$, withTimeRange, withRefresh]);

  return state;
}
