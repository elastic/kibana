/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';

import * as i18n from '../translations';

const STATS_ENDPOINT = '/internal/ecs_data_quality_dashboard/stats';

interface UseStats {
  stats: Record<string, IndicesStatsIndicesStats> | null;
  error: string | null;
  loading: boolean;
}

export const useStats = (pattern: string): UseStats => {
  const [stats, setStats] = useState<Record<string, IndicesStatsIndicesStats> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      try {
        const encodedIndexName = encodeURIComponent(`${pattern}`);

        const response = await fetch(`${STATS_ENDPOINT}/${encodedIndexName}`, {
          method: 'GET',
          signal: abortController.signal,
        });

        if (response.ok) {
          const json = await response.json();

          if (!abortController.signal.aborted) {
            setStats(json);
          }
        } else {
          throw new Error(response.statusText);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(i18n.ERROR_LOADING_STATS(e));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [pattern, setError]);

  return { stats, error, loading };
};
