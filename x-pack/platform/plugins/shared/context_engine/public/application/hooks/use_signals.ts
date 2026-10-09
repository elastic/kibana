/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DEFAULT_SIGNALS_PAGE_SIZE } from '../../../common/constants';
import type { ListSignalsResponse, Signal } from '../../../common/http_api/signals';
import { listSignals } from '../api/signals';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseSignalsArgs {
  tag: string | undefined;
  from?: number;
  size?: number;
}

interface UseSignalsResult {
  signals: Signal[];
  total: number;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Fetches the individual signals carrying a given tag (`GET /internal/context_engine/signals`).
 * Disabled until a tag is provided.
 */
export const useSignals = ({
  tag,
  from = 0,
  size = DEFAULT_SIGNALS_PAGE_SIZE,
}: UseSignalsArgs): UseSignalsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<ListSignalsResponse, Error>({
    queryKey: contextEngineQueryKeys.signals.byTag(tag ?? '', from, size),
    queryFn: ({ signal }) => {
      if (!tag) {
        throw new Error('A tag is required');
      }
      return listSignals(http, { tag, from, size, signal });
    },
    enabled: tag !== undefined,
    // Keep the current page rendered while a larger `size` (group flyout "Load more") refetches,
    // so the member list grows in place instead of collapsing to the loading skeleton.
    keepPreviousData: true,
  });

  return {
    signals: data?.signals ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ?? undefined,
    refetch,
  };
};
