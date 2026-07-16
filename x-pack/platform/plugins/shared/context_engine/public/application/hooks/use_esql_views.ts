/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { EsqlView } from '@kbn/esql-types';
import { getViews } from '@kbn/esql-utils';
import { useKibana } from './use_kibana';

interface UseEsqlViewsResult {
  views: EsqlView[];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Fetches the ES|QL views available in the cluster (`GET _query/view` via the
 * `esql` plugin route). The underlying `getViews` helper caches results and
 * falls back to an empty list when the API is unavailable.
 */
export const useEsqlViews = (): UseEsqlViewsResult => {
  const {
    services: { http },
  } = useKibana();
  const [views, setViews] = useState<EsqlView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(undefined);

    getViews(http)
      .then((result) => {
        if (!cancelled) {
          setViews(result.views);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [http]);

  return { views, isLoading, error };
};
