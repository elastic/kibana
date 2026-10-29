/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { KiListItem } from '../../../common/http_api/knowledge_indicators';
import { createKiQueryOptions } from './ki_query_options';
import { useKibana } from './use_kibana';

export const usePrefetchKi = (aiIndexId: string) => {
  const queryClient = useQueryClient();
  const {
    services: { http },
  } = useKibana();

  return useCallback(
    (ki: Pick<KiListItem, 'id' | 'index'>) => {
      if (ki.index.length === 0) {
        return;
      }

      const queryOptions = createKiQueryOptions(http, {
        aiIndexId,
        kiId: ki.id,
        index: ki.index,
      });
      const queryState = queryClient.getQueryState(queryOptions.queryKey);

      if (queryState?.data !== undefined || queryState?.fetchStatus === 'fetching') {
        return;
      }

      void queryClient.prefetchQuery(queryOptions);
    },
    [aiIndexId, http, queryClient]
  );
};
