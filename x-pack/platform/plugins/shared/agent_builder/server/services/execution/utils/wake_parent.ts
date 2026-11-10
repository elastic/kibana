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
import type {
  AgentExecution,
  AgentExecutionService,
  BaseExecutionParams,
} from '@kbn/agent-builder-server/execution';
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
  childExecutionId: string;
  executionClient: AgentExecutionClient;
  conversationService: ConversationService;
  executionService: AgentExecutionService;
}

/**
 * The settings the user or caller chose for the run that spawned the child, which its wake
 * continues: the model, project scope, effort, runtime overrides, size limit and tracing. Nothing
 * that belongs to that one request or to conversation creation.
 */
export const inheritedRunSettings = ({
  connectorId,
  projectRouting,
  reasoningLevel,
  configurationOverrides,
  maxContentLength,
  telemetryMetadata,
  workflowExecutionId,
}: BaseExecutionParams): Partial<BaseExecutionParams> =>
  Object.fromEntries(
    Object.entries({
      connectorId,
      projectRouting,
      reasoningLevel,
      configurationOverrides,
      maxContentLength,
      telemetryMetadata,
      workflowExecutionId,
    }).filter(([, value]) => value !== undefined)
  );

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
 * message alone for `never`. Everything is resolved from the child's record, so a caller needs
 * nothing but its id.
 */
export const wakeParent = async ({
  request,
  childExecutionId,
  executionClient,
  conversationService,
  executionService,
}: WakeParentParams): Promise<WakeParentResult> => {
  const child = await executionClient.get(childExecutionId);
  if (!child?.owner || !child.parentExecutionId) {
    return 'skipped';
  }
  // The run that spawned the child names the conversation and carries the settings the user
  // chose for it; the service would otherwise fall back to the agent's defaults.
  const parent = await executionClient.get(child.parentExecutionId);
  // A standalone parent has no conversation to report to.
  if (parent?.executionMode !== AgentExecutionMode.conversation) {
    return 'skipped';
  }
  const { conversationId } = parent.agentParams;
  if (!conversationId) {
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

  // A running parent has not stored its state yet, so it is tried and answers busy. An idle one
  // is skipped when it already reported the result, or when it waits on a prompt: a run on a
  // paused conversation is its resume, and the resume's first pass reports the finished child.
  if (
    !conversation.active_execution &&
    (!conversation.state?.background_executions?.[childExecutionId] ||
      isPendingResumeConversation(conversation))
  ) {
    return 'skipped';
  }

  const triggerMode = child.agentParams.parentTriggerMode ?? ChatTriggerMode.Always;
  try {
    await executionService.maybeExecuteAgent({
      mode: AgentExecutionMode.conversation,
      request,
      useTaskManager: true,
      requestImmediateClaim: true,
      // A parent that ran without a live caller keeps running without one, and keeps its approvals.
      ...(parent.interactivity ? { interactive: parent.interactivity } : {}),
      params: {
        // The agent that spawned the child, which may not be the one the conversation was created with.
        agentId: parent.agentId,
        ...inheritedRunSettings(parent.agentParams),
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

export interface ReportToParentParams extends Omit<WakeParentParams, 'childExecutionId'> {
  execution: AgentExecution;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}

/**
 * Wakes the parent of a finished background sub-agent. The retry task is scheduled before anything
 * is read, so a failed attempt or a busy parent is retried from a task with its own credential; an
 * attempt that settles the report removes it, and a task that outlives one finds nothing left to
 * do. Never throws.
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

  const taskId = wakeParentTaskId(childExecutionId);
  const scheduleRetry = async (): Promise<boolean> => {
    try {
      await taskManager.ensureScheduled(
        {
          id: taskId,
          taskType: taskTypes.wakeParent,
          params: { childExecutionId },
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
    const result = await wakeParent({ ...wake, childExecutionId });
    logger.debug(`Wake of the parent of background execution ${childExecutionId}: ${result}`);
    settled = result !== 'busy';
  } catch (error) {
    logger.warn(
      `Wake of the parent of background execution ${childExecutionId} failed${
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
