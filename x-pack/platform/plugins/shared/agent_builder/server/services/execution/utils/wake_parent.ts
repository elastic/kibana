/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  AgentExecutionMode,
  EventActorType,
  ExecutionStatus,
  isBackgroundExecutionAlreadyReportedError,
  isConversationBusyError,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecution, AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ConversationService } from '../../conversation';
import type { AgentExecutionClient } from '../persistence';
import {
  taskTypes,
  wakeParentTaskId,
  WAKE_PARENT_RETRY_INTERVAL_MS,
} from '../task/task_definitions';
import { isPendingResumeConversation } from './conversations';

export type WakeParentResult = 'woken' | 'busy' | 'skipped';

export interface WakeParentParams {
  request: KibanaRequest;
  conversationId: string;
  childExecutionId: string;
  executionClient: AgentExecutionClient;
  conversationService: ConversationService;
  executionService: AgentExecutionService;
}

export const describeFinishedChild = (child: AgentExecution): string => {
  const header = `Background sub-agent execution ${child.executionId} (agent ${child.agentId}) finished with status ${child.status}.`;
  const response = child.events.find(isRoundCompleteEvent)?.data.round.response.message;

  if (child.status === ExecutionStatus.completed && response) {
    return `${header}\n\nResult:\n${response}`;
  }
  if (child.error) {
    return `${header}\n\nError: ${child.error.message}`;
  }
  return header;
};

/** Starts a run on the parent conversation that reports a finished background sub-agent. */
export const wakeParent = async ({
  request,
  conversationId,
  childExecutionId,
  executionClient,
  conversationService,
  executionService,
}: WakeParentParams): Promise<WakeParentResult> => {
  const child = await executionClient.get(childExecutionId);
  if (!child?.owner) {
    return 'skipped';
  }

  // A task's request does not resolve to the user who spawned the sub-agent.
  const conversationClient = await conversationService.getScopedClientAsUser({
    request,
    user: { ...child.owner, isAdmin: false },
  });
  const conversation = await conversationClient.get(conversationId);

  // A running parent has not stored its state yet, so it is tried and answers busy; an idle one
  // is skipped when it already reported the result or is waiting on a prompt.
  if (
    !conversation.active_execution &&
    (!conversation.state?.background_executions?.[childExecutionId] ||
      isPendingResumeConversation(conversation))
  ) {
    return 'skipped';
  }

  try {
    await executionService.executeAgent({
      mode: AgentExecutionMode.conversation,
      request,
      useTaskManager: true,
      requestImmediateClaim: true,
      params: {
        conversationId,
        nextInput: { message: describeFinishedChild(child) },
        actor: { type: EventActorType.agent, id: child.agentId, username: child.agentId },
        reportsBackgroundExecution: childExecutionId,
      },
    });
  } catch (error) {
    if (isConversationBusyError(error)) {
      return 'busy';
    }
    if (isBackgroundExecutionAlreadyReportedError(error)) {
      return 'skipped';
    }
    throw error;
  }

  return 'woken';
};

export interface ReportToParentParams
  extends Omit<WakeParentParams, 'conversationId' | 'childExecutionId'> {
  execution: AgentExecution;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}

/**
 * Wakes the parent of a finished background sub-agent; a busy parent or a failed attempt is
 * retried from a task with its own credential. Never throws.
 */
export const reportToParent = async ({
  execution,
  taskManager,
  logger,
  ...wake
}: ReportToParentParams): Promise<void> => {
  const { executionId: childExecutionId, parentExecutionId } = execution;
  if (!parentExecutionId || !execution.agentParams.wakeParentOnCompletion) {
    return;
  }

  const conversationId = (await wake.executionClient.peek(parentExecutionId))?.conversationId;
  if (!conversationId) {
    return;
  }

  let retry = false;
  try {
    const result = await wakeParent({ ...wake, conversationId, childExecutionId });
    logger.debug(
      `Wake of conversation ${conversationId} for background execution ${childExecutionId}: ${result}`
    );
    retry = result === 'busy';
  } catch (error) {
    logger.warn(
      `Wake of conversation ${conversationId} for background execution ${childExecutionId} failed, retrying from a task: ${error.message}`
    );
    retry = true;
  }
  if (!retry) {
    return;
  }

  try {
    await taskManager.schedule(
      {
        id: wakeParentTaskId(childExecutionId),
        taskType: taskTypes.wakeParent,
        params: { conversationId, childExecutionId },
        state: {},
        scope: ['agent-builder'],
        enabled: true,
        runAt: new Date(Date.now() + WAKE_PARENT_RETRY_INTERVAL_MS),
      },
      { request: wake.request, cloneApiKey: true }
    );
  } catch (error) {
    logger.warn(
      `Failed to wake the parent of background execution ${childExecutionId}: ${error.message}`
    );
  }
};
