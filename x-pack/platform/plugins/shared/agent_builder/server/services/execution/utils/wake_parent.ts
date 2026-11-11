/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { Logger } from '@kbn/logging';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  AgentExecutionMode,
  ChatTriggerMode,
  EventActorType,
  isBackgroundExecutionAlreadyReportedError,
  isConversationBusyError,
  isConversationNotFoundError,
  isConversationPausedError,
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
import { isTerminalExecutionStatus } from '../run_agent/background_execution_service';
import { describeFinishedExecution } from '../run_agent/prompts/utils/notices';
import { isPendingResumeConversation } from './conversations';

export type WakeParentResult = 'woken' | 'queued' | 'busy' | 'skipped';

export interface WakeParentParams {
  request: KibanaRequest;
  childExecutionId: string;
  executionClient: AgentExecutionClient;
  conversationService: ConversationService;
  executionService: AgentExecutionService;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  /** The task's abort signal, when the wake runs from one. */
  signal?: AbortSignal;
}

/**
 * Waking a parent is behind the Agent Builder experimental features setting: off, a finished
 * child is left for the parent's next run to pick up, as before the feature existed. A read that
 * fails throws, so the attempt is retried like any other failure rather than dropped.
 */
const isWakeParentEnabled = ({
  request,
  uiSettings,
  savedObjects,
}: Pick<WakeParentParams, 'request' | 'uiSettings' | 'savedObjects'>): Promise<boolean> =>
  uiSettings
    .asScopedToClient(savedObjects.getScopedClient(request))
    .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);

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

export const describeFinishedChild = (child: AgentExecution): string =>
  describeFinishedExecution({
    executionId: child.executionId,
    agentId: child.agentId,
    status: child.status,
    response: child.events.find(isRoundCompleteEvent)?.data.round.response.message,
    error: child.error?.message,
  });

/**
 * Reports a finished background sub-agent to its parent conversation: a run for `always`, the
 * message alone for `never`. Everything is resolved from the child's record, so a caller needs
 * nothing but its id. A cancelled `signal` aborts the reads that take it and stops the wake at
 * the next step, before the parent is run.
 */
export const wakeParent = async ({
  request,
  childExecutionId,
  executionClient,
  conversationService,
  executionService,
  uiSettings,
  savedObjects,
  signal,
}: WakeParentParams): Promise<WakeParentResult> => {
  if (!(await isWakeParentEnabled({ request, uiSettings, savedObjects }))) {
    return 'skipped';
  }
  signal?.throwIfAborted();
  const child = await executionClient.get(childExecutionId, { signal });
  if (!child?.owner || !child.parentExecutionId) {
    return 'skipped';
  }
  // A finalizer whose last status write failed leaves the child running: reported now, its result
  // would be lost, so the attempt fails and is retried within the task's attempts.
  if (!isTerminalExecutionStatus(child.status)) {
    throw new Error(
      `Background execution ${childExecutionId} has not finished yet (status ${child.status})`
    );
  }
  // The run that spawned the child names the conversation and carries the settings the user
  // chose for it; the service would otherwise fall back to the agent's defaults.
  const parent = await executionClient.get(child.parentExecutionId, { signal });
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

  // The conversation read cannot carry the signal, so a cancellation during it is caught here.
  signal?.throwIfAborted();
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
    // Reported already, or paused on a prompt since the read above: the resume reports the child.
    if (isBackgroundExecutionAlreadyReportedError(error) || isConversationPausedError(error)) {
      return 'skipped';
    }
    throw error;
  }

  return triggerMode === ChatTriggerMode.Never ? 'queued' : 'woken';
};

export interface ReportToParentParams
  extends Omit<WakeParentParams, 'childExecutionId' | 'signal'> {
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
  // Checked before a retry is left behind; the wake checks again for a retry run after a toggle.
  // A read that fails leaves the setting unknown, so the attempt goes ahead and is retried.
  const enabled = await isWakeParentEnabled(wake).catch(() => undefined);
  if (enabled === false) {
    logger.debug(
      `Background execution ${childExecutionId} finished but waking its parent is disabled: left for the next run`
    );
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
