/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { HttpFetchQuery } from '@kbn/core/public';

import { useDataQualityContext } from '../../../../../data_quality_context';
import * as i18n from '../../../../../translations';
import { INTERNAL_API_VERSION } from '../../../../../constants';
import { MeteringStatsIndex } from '../../../../../types';
import { useIsMounted } from '../../../../../hooks/use_is_mounted';

const STATS_ENDPOINT = '/internal/ecs_data_quality_dashboard/stats';

export interface UseStats {
  stats: Record<string, MeteringStatsIndex> | null;
  error: string | null;
  loading: boolean;
}

export const useStats = ({
  endDate,
  pattern,
  startDate,
}: {
  endDate?: string | null;
  pattern: string;
  startDate?: string | null;
}): UseStats => {
  const { isMountedRef } = useIsMounted();
  const { httpFetch, isILMAvailable } = useDataQualityContext();
  const [stats, setStats] = useState<Record<string, MeteringStatsIndex> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      try {
        const encodedIndexName = encodeURIComponent(`${pattern}`);
        const query: HttpFetchQuery = { isILMAvailable };
        if (!isILMAvailable) {
          if (startDate) {
            query.startDate = startDate;
          }
          if (endDate) {
            query.endDate = endDate;
          }
        }

        const response = await httpFetch<Record<string, MeteringStatsIndex>>(
          `${STATS_ENDPOINT}/${encodedIndexName}`,
          {
            version: INTERNAL_API_VERSION,
            method: 'GET',
            signal: abortController.signal,
            query,
          }
        );

        if (!abortController.signal.aborted) {
          if (isMountedRef.current) {
            setStats(response);
          }
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          if (isMountedRef.current) {
            setError(i18n.ERROR_LOADING_STATS(e.message));
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [endDate, httpFetch, isILMAvailable, isMountedRef, pattern, setError, startDate]);

  return { stats, error, loading };
};
