/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskStore } from '@a2a-js/sdk/server';
import type { Task, TaskState } from '@a2a-js/sdk';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionStatus, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentExecution } from '@kbn/agent-builder-server/execution';
import type { InternalStartServices } from '../../services';

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

  return {
    id: execution.executionId,
    contextId: execution.executionId,
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
              contextId: execution.executionId,
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
  constructor(private getInternalServices: () => InternalStartServices) {}

  async load(taskId: string): Promise<Task | undefined> {
    const { execution } = this.getInternalServices();
    const agentExecution = await execution.getExecution(taskId);
    return agentExecution ? toA2ATask(agentExecution) : undefined;
  }

  // The execution document (written by the Task Manager handler) is the source of truth;
  // the SDK's own task-lifecycle bookkeeping doesn't need to be persisted separately.
  async save(_task: Task): Promise<void> {}
}
