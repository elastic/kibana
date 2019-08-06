/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { idx } from '@kbn/elastic-idx/target';
import { KFetchError } from 'ui/kfetch/kfetch_error';
export function useHTTPRequest<Response>(
  pathname: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
  body?: string,
  decode: (response: any) => Response = response => response
) {
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<KFetchError | null>(null);

  const makeRequest = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await kfetch({
        method,
        pathname,
        body,
      });
      setLoading(false);
      setResponse(decode(resp));
    } catch (err) {
      setLoading(false);
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
    }
  }, [method, pathname, body]);

  return {
    response,
    error,
    loading,
    makeRequest,
  };
}
