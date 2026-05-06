/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ScheduleTriggerContext, ReminderTriggerContext } from '@kbn/agent-builder-common';
import type { SessionsStart } from '@kbn/agent-builder-server';

// ---------------------------------------------------------------------------
// Task type constants
// ---------------------------------------------------------------------------

/**
 * Task type for recurring scheduled triggers.
 * One task per ScheduleTriggerSubscription, runs on its configured interval/cron.
 */
export const AGENT_SESSION_SCHEDULED_TASK_TYPE = 'agent_session:scheduled';

/**
 * Task type for one-shot reminder triggers.
 * Runs once at the configured time then self-removes.
 */
export const AGENT_SESSION_REMINDER_TASK_TYPE = 'agent_session:reminder';

// ---------------------------------------------------------------------------
// Task params — stored in the Task Manager document
// ---------------------------------------------------------------------------

export interface AgentSessionScheduledTaskParams {
  conversationId: string;
  subscriptionId: string;
  spaceId: string;
  /** Human-readable schedule description echoed into the trigger context. */
  scheduleDescription: string;
}

export interface AgentSessionReminderTaskParams {
  conversationId: string;
  subscriptionId: string;
  spaceId: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Task ID helpers
// ---------------------------------------------------------------------------

export const scheduledTaskId = (conversationId: string, subscriptionId: string) =>
  `agent_session:scheduled:${conversationId}:${subscriptionId}`;

export const reminderTaskId = (conversationId: string, subscriptionId: string) =>
  `agent_session:reminder:${conversationId}:${subscriptionId}`;

// ---------------------------------------------------------------------------
// Task definition factory
// ---------------------------------------------------------------------------

interface RegisterDeps {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  /** Resolved lazily at run time via getStartServices to avoid circular init order. */
  getSessionsStart: () => SessionsStart;
}

/**
 * Register both session trigger task types with Task Manager.
 * Call this during plugin setup (when taskManager.registerTaskDefinitions is available).
 */
export const registerAgentSessionTriggerTasks = ({
  taskManager,
  logger,
  getSessionsStart,
}: RegisterDeps): void => {
  // -------------------------------------------------------------------------
  // Recurring scheduled trigger
  // -------------------------------------------------------------------------
  taskManager.registerTaskDefinitions({
    [AGENT_SESSION_SCHEDULED_TASK_TYPE]: {
      title: 'Agent Session: Scheduled Trigger',
      description: 'Wakes a standing agent session on a recurring schedule.',
      timeout: '1m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance, fakeRequest }) => {
        return {
          run: async () => {
            if (!fakeRequest) {
              logger.error(
                `[${AGENT_SESSION_SCHEDULED_TASK_TYPE}] No fakeRequest — task was scheduled without a user context.`
              );
              return { state: taskInstance.state };
            }

            const { conversationId, subscriptionId, scheduleDescription } =
              taskInstance.params as AgentSessionScheduledTaskParams;

            const firedAt = new Date().toISOString();
            const context: ScheduleTriggerContext = {
              type: 'schedule_trigger',
              subscription_id: subscriptionId,
              event: { fired_at: firedAt, schedule_description: scheduleDescription },
            };

            try {
              const sessions = getSessionsStart();
              const client = sessions.getScopedClient({ request: fakeRequest as KibanaRequest });
              await client.enqueueTrigger(conversationId, context);
              logger.debug(
                `[${AGENT_SESSION_SCHEDULED_TASK_TYPE}] Enqueued trigger for session ${conversationId}, subscription ${subscriptionId}`
              );
            } catch (err) {
              logger.error(
                `[${AGENT_SESSION_SCHEDULED_TASK_TYPE}] Failed to enqueue trigger for session ${conversationId}: ${err}`
              );
              throw err;
            }

            return { state: taskInstance.state };
          },
        };
      },
    },
  });

  // -------------------------------------------------------------------------
  // One-shot reminder trigger
  // -------------------------------------------------------------------------
  taskManager.registerTaskDefinitions({
    [AGENT_SESSION_REMINDER_TASK_TYPE]: {
      title: 'Agent Session: Reminder Trigger',
      description: 'Wakes a standing agent session once at a configured time.',
      timeout: '1m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance, fakeRequest }) => {
        return {
          run: async () => {
            if (!fakeRequest) {
              logger.error(
                `[${AGENT_SESSION_REMINDER_TASK_TYPE}] No fakeRequest — task was scheduled without a user context.`
              );
              return { state: taskInstance.state };
            }

            const { conversationId, subscriptionId, note } =
              taskInstance.params as AgentSessionReminderTaskParams;

            const firedAt = new Date().toISOString();
            const context: ReminderTriggerContext = {
              type: 'reminder_trigger',
              subscription_id: subscriptionId,
              event: { reminder_id: subscriptionId, note, fired_at: firedAt },
            };

            try {
              const sessions = getSessionsStart();
              const client = sessions.getScopedClient({ request: fakeRequest as KibanaRequest });

              await client.enqueueTrigger(conversationId, context);

              // Auto-remove the reminder subscription — it's one-shot.
              try {
                await client.removeSubscription(conversationId, subscriptionId);
              } catch (removeErr) {
                // Non-fatal: subscription may have already been removed manually.
                logger.debug(
                  `[${AGENT_SESSION_REMINDER_TASK_TYPE}] Could not remove subscription ${subscriptionId} after firing: ${removeErr}`
                );
              }

              logger.debug(
                `[${AGENT_SESSION_REMINDER_TASK_TYPE}] Reminder fired for session ${conversationId}, subscription ${subscriptionId}`
              );
            } catch (err) {
              logger.error(
                `[${AGENT_SESSION_REMINDER_TASK_TYPE}] Failed to fire reminder for session ${conversationId}: ${err}`
              );
              throw err;
            }

            // Return deleteTaskAfterRun to prevent TM from rescheduling.
            return { state: taskInstance.state, deleteTaskAfterRun: true };
          },
        };
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Task scheduler helpers — called by SessionService when tools subscribe
// ---------------------------------------------------------------------------

interface ScheduleSessionTaskDeps {
  taskManager: TaskManagerStartContract;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Schedule (or update) a Task Manager task for a recurring session schedule subscription.
 * Idempotent: 409 conflicts update the existing task's schedule in place.
 */
export const scheduleSessionScheduledTask = async (
  params: AgentSessionScheduledTaskParams,
  schedule: IntervalSchedule,
  deps: ScheduleSessionTaskDeps
): Promise<string> => {
  const taskId = scheduledTaskId(params.conversationId, params.subscriptionId);

  try {
    const task = await deps.taskManager.schedule(
      {
        id: taskId,
        taskType: AGENT_SESSION_SCHEDULED_TASK_TYPE,
        schedule,
        params,
        state: {},
        scope: ['agent_sessions'],
        enabled: true,
      },
      { request: deps.request }
    );
    return task.id;
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 409) {
      await deps.taskManager.bulkUpdateSchedules([taskId], schedule, { request: deps.request });
      return taskId;
    }
    throw err;
  }
};

/**
 * Schedule a one-shot Task Manager task for a reminder subscription.
 * Uses `runAt` to fire exactly once at the configured time.
 */
export const scheduleSessionReminderTask = async (
  params: AgentSessionReminderTaskParams,
  firesAt: Date,
  deps: ScheduleSessionTaskDeps
): Promise<string> => {
  const taskId = reminderTaskId(params.conversationId, params.subscriptionId);

  const task = await deps.taskManager.schedule(
    {
      id: taskId,
      taskType: AGENT_SESSION_REMINDER_TASK_TYPE,
      runAt: firesAt,
      params,
      state: {},
      scope: ['agent_sessions'],
      enabled: true,
    },
    { request: deps.request }
  );
  return task.id;
};

/**
 * Cancel a Task Manager task for a session trigger subscription.
 * Non-fatal if the task no longer exists.
 */
export const cancelSessionTriggerTask = async (
  taskId: string,
  deps: { taskManager: TaskManagerStartContract; logger: Logger }
): Promise<void> => {
  try {
    await deps.taskManager.removeIfExists(taskId);
  } catch (err) {
    deps.logger.debug(`Could not remove task ${taskId}: ${err}`);
  }
};
