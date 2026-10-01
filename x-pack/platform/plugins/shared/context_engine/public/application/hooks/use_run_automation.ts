/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useQuery } from '@kbn/react-query';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';

const POLL_INTERVAL_MS = 7000;

export const useRunAutomation = (workflowId: string) => {
  const api = useWorkflowsApi();
  const [isStarting, setIsStarting] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['context_engine', 'automation_active_executions', workflowId],
    queryFn: () =>
      api.getWorkflowExecutions(workflowId, {
        statuses: [...NonTerminalExecutionStatuses],
        size: 1,
      }),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: true,
  });

  const isRunning = isStarting || (data?.total !== undefined && data.total > 0);

  const runAutomation = useCallback(async () => {
    setIsStarting(true);
    try {
      await api.runWorkflow(workflowId, { inputs: {} });
      await refetch();
    } finally {
      setIsStarting(false);
    }
  }, [api, workflowId, refetch]);

  return { isRunning, runAutomation };
};
