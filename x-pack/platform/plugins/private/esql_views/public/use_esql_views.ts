/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EsqlView } from '@kbn/esql-types';
import type { EsqlViewsClient } from '@kbn/esql-utils';

type LoadStatus = 'loading' | 'success' | 'error' | 'unsupported' | 'permissionDenied';

interface EsqlViewsState {
  views: EsqlView[];
  status: LoadStatus;
  error?: Error;
  isLoading: boolean;
}

const getErrorStatusCode = (error: Error): unknown =>
  'statusCode' in error ? error.statusCode : undefined;

const isUnsupportedError = (error: Error): boolean => {
  const statusCode = getErrorStatusCode(error);
  return statusCode === 404 || statusCode === 501;
};

const isPermissionDeniedError = (error: Error): boolean => {
  const statusCode = getErrorStatusCode(error);
  return statusCode === 401 || statusCode === 403;
};

export const useEsqlViews = (client: EsqlViewsClient) => {
  const requestCount = useRef(0);
  const [state, setState] = useState<EsqlViewsState>({
    views: [],
    status: 'loading',
    isLoading: true,
  });

  const loadViews = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const requestId = ++requestCount.current;

      setState((currentState) =>
        currentState.status === 'success'
          ? {
              // Keep the current views visible while reloading.
              ...currentState,
              error: undefined,
              isLoading: true,
            }
          : {
              // Show the loading state on the initial request or when retrying after an error.
              ...currentState,
              status: 'loading',
              error: undefined,
              isLoading: true,
            }
      );

      try {
        const { views } = await client.getViews(signal);
        if (!signal?.aborted && requestId === requestCount.current) {
          setState({ views, status: 'success', isLoading: false });
        }
      } catch (error) {
        if (!signal?.aborted && requestId === requestCount.current) {
          const requestError = error instanceof Error ? error : new Error(String(error));
          setState((currentState) => {
            if (isPermissionDeniedError(requestError)) {
              return {
                views: [],
                status: 'permissionDenied',
                error: requestError,
                isLoading: false,
              };
            }

            if (currentState.status === 'success') {
              return { ...currentState, error: requestError, isLoading: false };
            }

            return {
              views: [],
              status: isUnsupportedError(requestError) ? 'unsupported' : 'error',
              error: requestError,
              isLoading: false,
            };
          });
        }
      }
    },
    [client]
  );

  useEffect(() => {
    const abortController = new AbortController();
    void loadViews(abortController.signal);

    return () => {
      abortController.abort();
      requestCount.current += 1;
    };
  }, [loadViews]);

  const reload = useCallback(() => loadViews(), [loadViews]);

  return {
    ...state,
    reload,
  };
};
