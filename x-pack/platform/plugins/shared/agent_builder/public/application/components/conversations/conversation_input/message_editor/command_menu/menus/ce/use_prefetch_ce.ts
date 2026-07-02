/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { CeSearchFilters, CeSearchConstraints } from '@kbn/context-engine-plugin/public';
import { CE_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/ce/constants';
import { queryKeys } from '../../../../../../../query_keys';
import { useAgentBuilderServices } from '../../../../../../../hooks/use_agent_builder_service';
import { useContextEngineEnabled } from '../../../../../../../hooks/use_context_engine_enabled';
import { useExperimentalFeatures } from '../../../../../../../hooks/use_experimental_features';

export const usePrefetchCe = (constraints?: CeSearchConstraints, filters?: CeSearchFilters) => {
  const queryClient = useQueryClient();
  const { ceService } = useAgentBuilderServices();
  const contextEngineEnabled = useContextEngineEnabled();
  const experimentalEnabled = useExperimentalFeatures();
  const ceEnabled = contextEngineEnabled && experimentalEnabled;

  return useCallback(() => {
    if (!ceEnabled) {
      return;
    }
    queryClient.prefetchQuery({
      queryKey: queryKeys.ce.autocomplete('*', constraints, filters),
      queryFn: () =>
        ceService.autocomplete({
          query: '*',
          size: CE_SEARCH_DEFAULT_SIZE,
          constraints,
          filters,
        }),
    });
  }, [ceEnabled, queryClient, ceService, constraints, filters]);
};
