/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { queryAiIndices } from '../api/ai_indices';
import { KI_GRAPH_MAX_KIS, buildKiGraph, buildKiGraphQuery, type KiGraph } from '../utils/ki_graph';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseKiGraphResult {
  graph: KiGraph | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/** The current, active KIs of an AI index and the references between them, as a graph. */
export const useKiGraph = ({
  aiIndexId,
  dest,
}: {
  aiIndexId: string | undefined;
  dest: string | undefined;
}): UseKiGraphResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<KiGraph, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.graph(aiIndexId ?? '', dest ?? ''),
    queryFn: async ({ signal }) => {
      if (!dest) {
        throw new Error('AI index destination is required');
      }
      return buildKiGraph(
        await queryAiIndices(http, {
          query: buildKiGraphQuery(dest),
          limit: KI_GRAPH_MAX_KIS,
          signal,
        })
      );
    },
    enabled: aiIndexId !== undefined && dest !== undefined,
    refetchOnWindowFocus: false,
  });

  return { graph: data, isLoading, error: error ?? undefined, refetch };
};
