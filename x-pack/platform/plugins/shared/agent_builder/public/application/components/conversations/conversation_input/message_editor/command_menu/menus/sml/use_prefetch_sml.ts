/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../../../../../../../query_keys';
import { useAgentBuilderServices } from '../../../../../../../hooks/use_agent_builder_service';

export const usePrefetchSml = () => {
  const queryClient = useQueryClient();
  const { smlService } = useAgentBuilderServices();

  return useCallback(() => {
    const keywords = ['*'] as const;
    queryClient.prefetchQuery({
      queryKey: queryKeys.sml.search(keywords),
      queryFn: () => smlService.search({ keywords: [...keywords], size: 20 }),
    });
  }, [queryClient, smlService]);
};
