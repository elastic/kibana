/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { SmlSearchFilters } from '@kbn/agent-context-layer-plugin/public';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/sml/constants';
import { queryKeys } from '../../../../../../../query_keys';
import { useAgentBuilderServices } from '../../../../../../../hooks/use_agent_builder_service';
import { useExperimentalFeatures } from '../../../../../../../hooks/use_experimental_features';

export const usePrefetchSml = (filters?: SmlSearchFilters) => {
  const queryClient = useQueryClient();
  const { smlService } = useAgentBuilderServices();
  const experimentalFeaturesEnabled = useExperimentalFeatures();

  return useCallback(() => {
    if (!experimentalFeaturesEnabled) {
      return;
    }
    queryClient.prefetchQuery({
      queryKey: queryKeys.sml.search('*', true, filters),
      queryFn: () =>
        smlService.search({
          query: '*',
          size: SML_SEARCH_DEFAULT_SIZE,
          skipContent: true,
          filters,
        }),
    });
  }, [experimentalFeaturesEnabled, queryClient, smlService, filters]);
};
