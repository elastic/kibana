/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { isTerminalStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import { useState } from 'react';
import { workflowKeys } from './query_key_factory';

const POLL_INTERVAL_MS = 2_000;

/** Polling stops after this long even if the execution has not finished. */
const POLL_TIMEOUT_MS = 5 * 60_000;

/**
 * Polls a workflow execution until it reaches a terminal status, or for at most 5 minutes. Polling
 * stops on the first error, for example when the user cannot read workflow executions.
 */
export const useWorkflowExecutionStatus = (executionId: string) => {
  const workflowsApi = useService(WorkflowApi);
  const [startedAt] = useState(() => Date.now());

  return useQuery<WorkflowExecutionDto, Error>({
    queryKey: workflowKeys.execution(executionId),
    queryFn: () => workflowsApi.getExecution(executionId, { omitStepExecutions: true }),
    refetchOnWindowFocus: false,
    retry: false,
    refetchInterval: (execution, query) =>
      query.state.status === 'error' ||
      (execution && isTerminalStatus(execution.status)) ||
      Date.now() - startedAt > POLL_TIMEOUT_MS
        ? false
        : POLL_INTERVAL_MS,
  });
};
