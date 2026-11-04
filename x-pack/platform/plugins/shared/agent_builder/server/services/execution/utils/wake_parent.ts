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
  ChatTriggerMode,
  EventActorType,
  ExecutionStatus,
  isBackgroundExecutionAlreadyReportedError,
  isConversationBusyError,
  isConversationNotFoundError,
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

export type WakeParentResult = 'woken' | 'queued' | 'busy' | 'skipped';

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

/**
 * Reports a finished background sub-agent to its parent conversation: a run for `always`, the
 * message alone for `never`.
 */
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
  const conversation = await conversationClient.get(conversationId).catch((error: unknown) => {
    // A parent deleted while the child ran has nothing left to report to.
    if (isConversationNotFoundError(error)) {
      return undefined;
    }
    throw error;
  });
  if (!conversation) {
    return 'skipped';
  }

  // A running parent has not stored its state yet, so it is tried and answers busy; an idle one
  // is skipped when it already reported the result or is waiting on a prompt.
  if (
    !conversation.active_execution &&
    (!conversation.state?.background_executions?.[childExecutionId] ||
      isPendingResumeConversation(conversation))
  ) {
    return 'skipped';
  }

  const triggerMode = child.agentParams.parentTriggerMode ?? ChatTriggerMode.Always;
  // The run that spawned the child carries the model the user chose; the service would otherwise
  // fall back to the agent's default.
  const parent = child.parentExecutionId
    ? await executionClient.get(child.parentExecutionId)
    : undefined;
  const connectorId = parent?.agentParams.connectorId;
  try {
    await executionService.maybeExecuteAgent({
      mode: AgentExecutionMode.conversation,
      request,
      useTaskManager: true,
      requestImmediateClaim: true,
      params: {
        // The service defaults a missing agent, it does not read the conversation's.
        agentId: conversation.agent_id,
        ...(connectorId ? { connectorId } : {}),
        conversationId,
        nextInput: { message: describeFinishedChild(child) },
        actor: { type: EventActorType.agent, id: child.agentId, username: child.agentId },
        reportsBackgroundExecution: childExecutionId,
        triggerMode,
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

  return triggerMode === ChatTriggerMode.Never ? 'queued' : 'woken';
};

export interface ReportToParentParams
  extends Omit<WakeParentParams, 'conversationId' | 'childExecutionId'> {
  execution: AgentExecution;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}

/**
 * Wakes the parent of a finished background sub-agent. The retry task is scheduled first, so a
 * failed attempt or a busy parent is retried from a task with its own credential; an attempt that
 * settles the report removes it, and a task that outlives one finds nothing left to do. Never throws.
 */
export const reportToParent = async ({
  execution,
  taskManager,
  logger,
  ...wake
}: ReportToParentParams): Promise<void> => {
  const { executionId: childExecutionId, parentExecutionId } = execution;
  if (!parentExecutionId || !execution.agentParams.parentTriggerMode) {
    return;
  }

  const conversationId = (await wake.executionClient.peek(parentExecutionId))?.conversationId;
  if (!conversationId) {
    return;
  }

  const taskId = wakeParentTaskId(childExecutionId);
  const scheduleRetry = async (): Promise<boolean> => {
    try {
      await taskManager.ensureScheduled(
        {
          id: taskId,
          taskType: taskTypes.wakeParent,
          params: { conversationId, childExecutionId },
          state: {},
          scope: ['agent-builder'],
          enabled: true,
          runAt: new Date(Date.now() + WAKE_PARENT_RETRY_INTERVAL_MS),
        },
        { request: wake.request, cloneApiKey: true }
      );
      return true;
    } catch (error) {
      logger.warn(
        `Failed to schedule the wake retry for background execution ${childExecutionId}: ${error.message}`
      );
      return false;
    }
  };

  let scheduled = await scheduleRetry();

  let settled = false;
  try {
    const result = await wakeParent({ ...wake, conversationId, childExecutionId });
    logger.debug(
      `Wake of conversation ${conversationId} for background execution ${childExecutionId}: ${result}`
    );
    settled = result !== 'busy';
  } catch (error) {
    logger.warn(
      `Wake of conversation ${conversationId} for background execution ${childExecutionId} failed${
        scheduled ? ', retrying from a task' : ''
      }: ${error.message}`
    );
  }

  if (!settled) {
    // One more try at leaving a retry behind, for a scheduling failure that has since passed.
    if (!scheduled) {
      scheduled = await scheduleRetry();
    }
    return;
  }
  if (!scheduled) {
    return;
  }

  try {
    await taskManager.removeIfExists(taskId);
  } catch (error) {
    logger.debug(
      `Failed to remove the wake retry for background execution ${childExecutionId}, which will find the parent reported: ${error.message}`
    );
  }
};
