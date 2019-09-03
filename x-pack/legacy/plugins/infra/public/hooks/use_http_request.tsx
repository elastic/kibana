/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { idx } from '@kbn/elastic-idx/target';
import { KFetchError } from 'ui/kfetch/kfetch_error';
import { useTrackedPromise } from '../utils/use_tracked_promise';
export function useHTTPRequest<Response>(
  pathname: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
  body?: string,
  decode: (response: any) => Response = response => response
) {
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<KFetchError | null>(null);
  const [request, makeRequest] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: () =>
        kfetch({
          method,
          pathname,
          body,
        }),
      onResolve: resp => setResponse(decode(resp)),
      onReject: (e: unknown) => {
        const err = e as KFetchError;
        setError(err);
        toastNotifications.addWarning({
          title: i18n.translate('xpack.infra.useHTTPRequest.error.title', {
            defaultMessage: `Error while fetching resource`,
          }),
          text: (
            <div>
              <h5>
                {i18n.translate('xpack.infra.useHTTPRequest.error.status', {
                  defaultMessage: `Error`,
                })}
              </h5>
              {idx(err.res, r => r.statusText)} ({idx(err.res, r => r.status)})
              <h5>
                {i18n.translate('xpack.infra.useHTTPRequest.error.url', {
                  defaultMessage: `URL`,
                })}
              </h5>
              {idx(err.res, r => r.url)}
            </div>
          ),
        });
      },
    },
    [pathname, body, method]
  );

  const loading = useMemo(() => {
    if (request.state === 'resolved' && response === null) {
      return true;
    }
    return request.state === 'pending';
  }, [request.state, response]);

  return {
    response,
    error,
    loading,
    makeRequest,
  };
}
