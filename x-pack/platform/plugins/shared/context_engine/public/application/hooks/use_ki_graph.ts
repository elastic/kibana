/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { queryAiIndices } from '../api/ai_index_query';
import { buildKiGraph } from '../components/ki_graph/build_ki_graph';
import { buildKiGraphQuery, KI_GRAPH_MAX_ROWS } from '../components/ki_graph/build_ki_graph_query';
import { toEsqlRecords } from '../components/ki_graph/esql_rows';
import type { KiGraph } from '../components/ki_graph/types';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

export interface UseKiGraphResult {
  graph: KiGraph | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

export const useKiGraph = (aiIndex: GetAiIndexResponse | undefined): UseKiGraphResult => {
  const {
    services: { http },
  } = useKibana();

  const dest = aiIndex?.dest.value;

  const { data, isLoading, error, refetch } = useQuery<KiGraph, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.kiGraph(aiIndex?.id ?? ''),
    queryFn: async ({ signal }) => {
      if (dest === undefined || dest.length === 0) {
        throw new Error('AI index destination is required');
      }
      const response = await queryAiIndices(
        http,
        { query: buildKiGraphQuery(dest), limit: KI_GRAPH_MAX_ROWS },
        { signal }
      );
      return buildKiGraph(toEsqlRecords(response.columns, response.values), KI_GRAPH_MAX_ROWS);
    },
    enabled: dest !== undefined && dest.length > 0,
  });

  return {
    graph: data,
    isLoading,
    error: error ?? undefined,
    refetch,
  };
};
