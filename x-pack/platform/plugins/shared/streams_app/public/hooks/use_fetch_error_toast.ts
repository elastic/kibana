/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { useKibana } from './use_kibana';
import { getFormattedError } from '../util/errors';

export function useFetchErrorToast() {
  const {
    core: { notifications },
  } = useKibana();

  return useCallback(
    (error: unknown) => {
      let requestUrl: string | undefined;
      if (
        error &&
        typeof error === 'object' &&
        'request' in error &&
        typeof error.request === 'object' &&
        !!error.request &&
        'url' in error.request &&
        typeof error.request.url === 'string'
      ) {
        requestUrl = error.request.url;
      }

      return notifications.toasts.addError(getFormattedError(error), {
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
