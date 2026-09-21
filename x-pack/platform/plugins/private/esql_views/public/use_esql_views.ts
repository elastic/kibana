/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { EsqlView } from '@kbn/esql-types';
import type { EsqlViewsClient } from '@kbn/esql-utils';

type LoadStatus = 'loading' | 'success' | 'error' | 'unsupported';

interface EsqlViewsState {
  views: EsqlView[];
  status: LoadStatus;
  error?: Error;
}

const isUnsupportedError = (error: Error): boolean => {
  const statusCode = 'statusCode' in error ? error.statusCode : undefined;
  return statusCode === 404 || statusCode === 501;
};

export const useEsqlViews = (client: EsqlViewsClient) => {
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<EsqlViewsState>({
    views: [],
    status: 'loading',
  });

  useEffect(() => {
    const abortController = new AbortController();

    setState((currentState) => ({
      ...currentState,
      status: 'loading',
      error: undefined,
    }));

    client
      .getViews(abortController.signal)
      .then(({ views }) => {
        if (!abortController.signal.aborted) {
          setState({ views, status: 'success' });
        }
      })
      .catch((error: Error) => {
        if (!abortController.signal.aborted) {
          setState({
            views: [],
            status: isUnsupportedError(error) ? 'unsupported' : 'error',
            error,
          });
        }
      });

    return () => abortController.abort();
  }, [client, requestVersion]);

  const reload = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  return {
    ...state,
    reload,
  };
};
