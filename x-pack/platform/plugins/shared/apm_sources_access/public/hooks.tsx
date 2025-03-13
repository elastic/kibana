/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { APIEndpoint, APIReturnType } from '../server';
import { callSourcesAPI } from './api';

function getDetailsFromErrorResponse(error: IHttpFetchError<ResponseErrorBody>) {
  const message = error.body?.message ?? error.response?.statusText;
  return (
    <>
      {message} ({error.response?.status})
      <h5>
        {i18n.translate('xpack.apmSourcesAccess.fetcher.error.url', {
          defaultMessage: `URL`,
        })}
      </h5>
      {error.response?.url}
    </>
  );
}

interface SourcesAPIFetcherParams<T extends APIEndpoint> {
  pathname: T;
  body?: unknown;
}

interface SourcesAPIReturn<T extends APIEndpoint> {
  data: APIReturnType<T> | undefined;
  refetch: () => void;
}

export const useSourcesAPIFetcher = <T extends APIEndpoint>({
  pathname,
  body,
}: SourcesAPIFetcherParams<T>): SourcesAPIReturn<T> => {
  const [data, setData] = useState();
  const [counter, setCounter] = useState(0);
  const { services, notifications } = useKibana();

  if (!services.http) {
    throw new Error('HTTP service not available');
  }

  const http = services.http;

  useEffect(() => {
    let controller: AbortController | null = null;

    async function doFetch() {
      controller?.abort();

      controller = new AbortController();

      const signal = controller.signal;

      try {
        const payload = await callSourcesAPI(http, pathname, {
          signal,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        setData(payload);
      } catch (error) {
        if (!signal.aborted) {
          const errorDetails =
            'response' in error ? getDetailsFromErrorResponse(error) : error.message;

          notifications.toasts.danger({
            title: i18n.translate('xpack.apmSourcesAccess.fetcher.error.title', {
              defaultMessage: `Error while fetching resource`,
            }),

            body: (
              <div>
                <h5>
                  {i18n.translate('xpack.apmSourcesAccess.fetcher.error.status', {
                    defaultMessage: `Error`,
                  })}
                </h5>

                {errorDetails}
              </div>
            ),
          });
        }
      } finally {
        controller = null;
      }
    }

    doFetch();

    return () => controller?.abort();
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [counter]);

  return { data, refetch: () => setCounter((retry) => retry + 1) };
};
