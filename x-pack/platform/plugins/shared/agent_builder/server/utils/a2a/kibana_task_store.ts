/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskStore } from '@a2a-js/sdk/server';
import type { Task, TaskState } from '@a2a-js/sdk';
import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { InternalStartServices } from '../../services';
import { getCurrentSpaceId } from '../spaces';

const generateMessageId = () => `msg-${uuidv4()}`;

const EXECUTION_STATUS_TO_TASK_STATE: Record<ExecutionStatus, TaskState> = {
  [ExecutionStatus.scheduled]: 'submitted',
  [ExecutionStatus.running]: 'working',
  [ExecutionStatus.completed]: 'completed',
  [ExecutionStatus.failed]: 'failed',
  [ExecutionStatus.aborted]: 'canceled',
};

const getFinalMessageText = (execution: AgentExecution): string | undefined => {
  const roundCompleteEvent = execution.events.find(isRoundCompleteEvent);
  return roundCompleteEvent?.data.round.response.message;
};

const toA2ATask = (execution: AgentExecution): Task => {
  const state = EXECUTION_STATUS_TO_TASK_STATE[execution.status];
  const responseText =
    state === 'completed' ? getFinalMessageText(execution) : execution.error?.message;
  // KibanaAgentExecutor persists the original A2A contextId as metadata; fall back to the
  // executionId for executions that predate that (or weren't scheduled through A2A).
  const contextId = execution.metadata?.a2aContextId ?? execution.executionId;

  return {
    id: execution.executionId,
    contextId,
    kind: 'task',
    status: {
      state,
      timestamp: execution['@timestamp'],
      ...(responseText
        ? {
            message: {
              kind: 'message',
              role: 'agent',
              messageId: generateMessageId(),
              parts: [{ kind: 'text', text: responseText }],
              taskId: execution.executionId,
              contextId,
            },
          }
        : {}),
    },
  };
};

/**
 * TaskStore backing A2A `tasks/get` polling with Kibana's ES-backed execution documents,
 * so a poll landing on a different node than the one that scheduled the task still resolves.
 */
export class KibanaTaskStore implements TaskStore {
  constructor(
    private getInternalServices: () => InternalStartServices,
    private kibanaRequest: KibanaRequest
  ) {}

  async load(taskId: string): Promise<Task | undefined> {
    const { execution, spaces } = this.getInternalServices();
    const agentExecution = await execution.getExecution(taskId);
    if (!agentExecution) {
      return undefined;
    }

    // The execution is fetched by raw document id with no space filter, so it must be checked
    // here — otherwise a caller in one space could poll a task scheduled in another space.
    const currentSpaceId = getCurrentSpaceId({ request: this.kibanaRequest, spaces });
    if (agentExecution.spaceId !== currentSpaceId) {
      return undefined;
    }

    return toA2ATask(agentExecution);
  }

  // The execution document (written by the Task Manager handler) is the source of truth;
  // the SDK's own task-lifecycle bookkeeping doesn't need to be persisted separately.
  async save(_task: Task): Promise<void> {}
}
