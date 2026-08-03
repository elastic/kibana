/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { disableSelfImprovement, enableSelfImprovement } from '../api/patterns';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Enables/disables self-improvement for an AI index. Enabling records the trace
 * index and schedules the case_builder + trace_classifier tasks server-side.
 */
export const useSelfImprovement = (aiIndexId: string) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.aiIndex.detail(aiIndexId) });
    queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.patterns.list(aiIndexId) });
  };

  const enable = useMutation({
    mutationFn: (tracesIndex: string) => enableSelfImprovement(http, { aiIndexId, tracesIndex }),
    onSuccess: invalidate,
  });

  const disable = useMutation({
    mutationFn: () => disableSelfImprovement(http, { aiIndexId }),
    onSuccess: invalidate,
  });

  return { enable, disable };
};
