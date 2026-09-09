/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type { CostResponse } from '@kbn/significant-events-plugin/common';
import { getFormattedError } from '../util/errors';
import { useKibana } from './use_kibana';
import { useRunQuotas } from './use_significant_events_run_quotas';

export const SIGNIFICANT_EVENTS_COST_QUERY_KEY = ['significantEventsCost'] as const;

const refreshSequenceByQueryClient = new WeakMap<object, number>();

export const useSignificantEventsCost = ({
  enabled,
}: {
  enabled: boolean;
}): {
  data: CostResponse | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refreshCost: () => Promise<void>;
  retryCost: () => Promise<void>;
} => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;
  const queryClient = useQueryClient();
  const quotas = useRunQuotas();
  const canManage = quotas.data?.canManage === true;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualError, setManualError] = useState<Error | null>(null);
  const activeRefreshes = useRef(0);

  const query = useQuery<CostResponse, Error>({
    queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/cost', {
        signal: signal ?? null,
      }),
    enabled: !quotas.isError && canManage && enabled,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const retryCost = useCallback(async (): Promise<void> => {
    setManualError(null);
    await query.refetch();
  }, [query]);

  const refreshCost = useCallback(async (): Promise<void> => {
    const refreshId = (refreshSequenceByQueryClient.get(queryClient) ?? 0) + 1;
    refreshSequenceByQueryClient.set(queryClient, refreshId);
    activeRefreshes.current += 1;
    setIsRefreshing(true);
    setManualError(null);
    try {
      await queryClient.cancelQueries({ queryKey: SIGNIFICANT_EVENTS_COST_QUERY_KEY });
      const response = await significantEventsRepositoryClient.fetch(
        'GET /internal/significant_events/cost',
        {
          signal: null,
          params: { query: { refresh: true } },
        }
      );
      if (refreshId === refreshSequenceByQueryClient.get(queryClient)) {
        queryClient.setQueryData(SIGNIFICANT_EVENTS_COST_QUERY_KEY, response);
      }
    } catch (error) {
      if (refreshId === refreshSequenceByQueryClient.get(queryClient)) {
        setManualError(getFormattedError(error));
      }
    } finally {
      activeRefreshes.current -= 1;
      setIsRefreshing(activeRefreshes.current > 0);
    }
  }, [queryClient, significantEventsRepositoryClient]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefreshing,
    error: manualError ?? query.error ?? null,
    refreshCost,
    retryCost,
  };
};
