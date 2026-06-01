/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { safeJsonStringify } from '@kbn/std';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';

/**
 * Polls the current state of a HITL workflow execution.
 * Called after resumeWorkflowExecution to detect when the workflow finishes.
 */
export type WorkflowExecutionPoller = (executionId: string) => Promise<{
  status: string;
  output?: unknown;
  error_message?: string;
} | null>;

/** Terminal workflow execution status strings (from @kbn/workflows ExecutionStatus). */
export const TERMINAL_WORKFLOW_STATUSES = new Set<string>(['COMPLETED', 'FAILED']);

export const createHitlWorkflowChecker = ({
  logger,
  poller,
}: {
  logger: Logger;
  poller: WorkflowExecutionPoller;
}) => {
  const register = (executionId: string): BackgroundExecutionState => ({
    execution_id: executionId,
    kind: 'hitl_workflow',
    status: ExecutionStatus.running,
  });

  const check = async (
    entry: BackgroundExecutionState,
    { roundId, toolCallGroupId }: { roundId: string; toolCallGroupId?: string }
  ): Promise<BackgroundExecutionState | undefined> => {
    const execution = await poller(entry.execution_id);
    logger.debug(
      () =>
        `[hitl-debug][ab] hitlChecker.check exec=${
          entry.execution_id
        } seq=(none) stepId=(none) status=${execution?.status ?? 'null'}`
    );
    if (!execution || !TERMINAL_WORKFLOW_STATUSES.has(execution.status)) {
      return undefined;
    }

    const isCompleted = execution.status === 'COMPLETED';
    const updated: BackgroundExecutionState = {
      ...entry,
      status: isCompleted ? ExecutionStatus.completed : ExecutionStatus.failed,
      completed_at: { round_id: roundId, tool_call_group_id: toolCallGroupId },
    };

    if (isCompleted) {
      updated.response = {
        message: safeJsonStringify(execution.output) ?? 'Workflow completed.',
      };
    } else if (execution.error_message) {
      updated.error = {
        code: 'internal_error' as NonNullable<BackgroundExecutionState['error']>['code'],
        message: execution.error_message,
      };
    }

    return updated;
  };

  return { check, register };
};
