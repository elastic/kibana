/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';

export function useFetchErrorToast() {
  const {
    core: { notifications },
  } = useKibana();

  return useCallback(
    (error: Error) => {
      if (
        'body' in error &&
        typeof error.body === 'object' &&
        !!error.body &&
        'message' in error.body &&
        typeof error.body.message === 'string'
      ) {
        error.message = error.body.message;
      }

      if (error instanceof AggregateError) {
        error.message = error.errors.map((err) => err.message).join(', ');
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
    },
    [notifications]
  );
}
