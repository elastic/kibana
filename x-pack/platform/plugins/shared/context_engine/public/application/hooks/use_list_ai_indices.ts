/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TableListViewFindItemsFn } from '@kbn/content-list-provider-client';
import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { ListAiIndexResponse } from '../../../common/http_api/ai_indices';
import { listAiIndices } from '../api/ai_indices';
import { createFindAiIndices } from '../utils/ai_index_content_list_utils';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

const getAiIndexListQueryOptions = (http: HttpStart) => ({
  queryKey: contextEngineQueryKeys.aiIndex.list(),
  queryFn: ({ signal }: { signal?: AbortSignal }) => listAiIndices(http, { signal }),
});

export const useAiIndexFindItems = (): TableListViewFindItemsFn => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  useQuery<ListAiIndexResponse, Error>(getAiIndexListQueryOptions(http));

  return useCallback(
    async (searchQuery, _options, signal) => {
      const { ai_indices } = await queryClient.ensureQueryData<ListAiIndexResponse>({
        ...getAiIndexListQueryOptions(http),
        queryFn: ({ signal: querySignal }) =>
          listAiIndices(http, { signal: querySignal ?? signal }),
      });

      return createFindAiIndices(ai_indices)(searchQuery);
    },
    [queryClient, http]
  );
};
