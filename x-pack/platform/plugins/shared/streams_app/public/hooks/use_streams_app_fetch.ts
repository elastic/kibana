/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { AbortableAsyncState, useAbortableAsync } from '@kbn/react-hooks';
import { TimeState } from '@kbn/es-query';
import { NotificationsStart } from '@kbn/core/public';
import { useKibana } from './use_kibana';
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
  deps: any[],
  options?: TOptions
): AbortableAsyncState<T> {
  const {
    core: { notifications },
  } = useKibana();

  const { disableToastOnError = false, withRefresh = false, withTimeRange = false } = options || {};

  const { timeState, timeState$ } = useTimefilter();

  const onError = (error: Error) => {
    if (!disableToastOnError && !isRequestAbortedError(error)) {
      showErrorToast(notifications, error);

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

export function showErrorToast(notifications: NotificationsStart, error: Error) {
  if (
    'body' in error &&
    typeof error.body === 'object' &&
    !!error.body &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    error.message = error.body.message;
  }

  let requestUrl: string | undefined;
  if (
    'request' in error &&
    typeof error.request === 'object' &&
    !!error.request &&
    'url' in error.request &&
    typeof error.request.url === 'string'
  ) {
    requestUrl = error.request.url;
  }

  return notifications.toasts.addError(error, {
    title: i18n.translate('xpack.streams.failedToFetchError', {
      defaultMessage: 'Failed to fetch data{requestUrlSuffix}',
      values: {
        requestUrlSuffix: requestUrl ? ` (${requestUrl})` : '',
      },
    }),
  });
}
