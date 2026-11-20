/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient } from '@kbn/react-query';
import { useEffect, useRef } from 'react';
import { contextEngineQueryKeys } from './query_keys';

/**
 * Refreshes the knowledge document lists, counts and chart of an AI index when an automation
 * run ends, because a run can add or change knowledge documents.
 */
export const useRefreshKnowledgeDocumentsAfterRun = (
  aiIndexId: string | undefined,
  isRunning: boolean
): void => {
  const queryClient = useQueryClient();
  const wasRunning = useRef(isRunning);

  useEffect(() => {
    const hasRunEnded = wasRunning.current && !isRunning;
    wasRunning.current = isRunning;
    if (!hasRunEnded || aiIndexId === undefined) {
      return;
    }
    queryClient.invalidateQueries({
      queryKey: contextEngineQueryKeys.aiIndex.listKiPrefix(aiIndexId),
    });
  }, [aiIndexId, isRunning, queryClient]);
};
