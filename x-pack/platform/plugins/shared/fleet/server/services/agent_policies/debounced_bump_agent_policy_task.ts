/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskStatus, throwRetryableError } from '@kbn/task-manager-plugin/server';

import { agentPolicyService, appContextService } from '..';
import { getSpaceForAgentPolicy } from '../spaces/helpers';

const TASK_TYPE = 'fleet:debounced_bump_agent_policy';

/** How long a scheduled bump waits for more changes to the same agent policy by default. */
export const DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS = 5_000;

const CONFLICT_RETRY_DELAY_MS = 1_000;
const MAX_SCHEDULE_ATTEMPTS = 3;

export const getDebouncedBumpAgentPolicyTaskId = (agentPolicyId: string) =>
  `${TASK_TYPE}:${agentPolicyId}`;

/**
 * Bumps an agent policy's revision through a space it lives in, so callers
 * don't need to know its space. A missing agent policy has no agents to
 * redeploy, so it is skipped.
 */
const bumpAgentPolicyRevision = async (agentPolicyId: string): Promise<void> => {
  const [agentPolicy] = await agentPolicyService.getByIds(
    appContextService.getInternalUserSOClientWithoutSpaceExtension(),
    [{ id: agentPolicyId, spaceId: '*' }],
    { ignoreMissing: true, fields: ['name'] }
  );
  if (!agentPolicy) {
    appContextService
      .getLogger()
      .debug(`Skipping revision bump of missing agent policy [${agentPolicyId}]`);
    return;
  }

  await agentPolicyService.bumpRevision(
    appContextService.getInternalUserSOClientForSpaceId(getSpaceForAgentPolicy(agentPolicy)),
    appContextService.getInternalUserESClient(),
    agentPolicyId,
    { asyncDeploy: true }
  );
};

export function registerDebouncedBumpAgentPolicyTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Debounced agent policy revision bump',
      description:
        'Bumps an agent policy revision once for all changes scheduled for it within a short window, so the policy is redeployed once.',
      timeout: '1m',
      maxAttempts: 3,
      cost: TaskCost.Tiny,
      paramsSchema: schema.object({ agentPolicyId: schema.string({ maxLength: 255 }) }),
      createTaskRunner: ({ taskInstance, signal }) => ({
        async run() {
          const { agentPolicyId } = taskInstance.params as { agentPolicyId: string };
          // Returning would delete the task and drop the bump, so retry instead.
          if (signal.aborted) {
            throwRetryableError(new Error('Debounced agent policy revision bump aborted'), true);
          }

          try {
            await bumpAgentPolicyRevision(agentPolicyId);
          } catch (error) {
            // A concurrent write to the same agent policy wins a version
            // conflict; that clears quickly, unlike other failures.
            throwRetryableError(
              error,
              SavedObjectsErrorHelpers.isConflictError(error)
                ? new Date(Date.now() + CONFLICT_RETRY_DELAY_MS)
                : true
            );
          }
          return { state: {} };
        },
      }),
    },
  });
}

/**
 * Schedules a revision bump for each agent policy, sharing one task per agent
 * policy across all callers and Kibana nodes, so a burst of changes to one
 * agent policy redeploys it once. A bump that cannot be handed to a task runs
 * right away, so no change is left undeployed.
 */
export async function scheduleDebouncedBumpAgentPolicyTask(
  taskManagerStart: TaskManagerStartContract,
  agentPolicyIds: readonly string[],
  { delayMs = DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS }: { delayMs?: number } = {}
): Promise<void> {
  await Promise.all(
    [...new Set(agentPolicyIds)].map(async (agentPolicyId) => {
      try {
        if (await handOffRevisionBump(taskManagerStart, agentPolicyId, delayMs)) {
          return;
        }
      } catch (error) {
        appContextService
          .getLogger()
          .warn(
            `Failed to schedule a revision bump for agent policy [${agentPolicyId}], bumping it now: ${error.message}`
          );
      }
      await bumpAgentPolicyRevision(agentPolicyId);
    })
  );
}

/**
 * Returns whether a task bump is guaranteed to run after this call. When it
 * returns false, the caller must bump the agent policy itself.
 */
const handOffRevisionBump = async (
  taskManagerStart: TaskManagerStartContract,
  agentPolicyId: string,
  delayMs: number
): Promise<boolean> => {
  const id = getDebouncedBumpAgentPolicyTaskId(agentPolicyId);

  for (let attempt = 0; attempt < MAX_SCHEDULE_ATTEMPTS; attempt += 1) {
    try {
      await taskManagerStart.schedule({
        id,
        taskType: TASK_TYPE,
        scope: ['fleet'],
        params: { agentPolicyId },
        state: {},
        runAt: new Date(Date.now() + delayMs),
      });
      return true;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }

    const pending = await getTask(taskManagerStart, id);
    // Completed between the schedule and the read: schedule a fresh bump.
    if (!pending) {
      continue;
    }
    // A claimed bump has not read the agent policy yet, so it covers this call.
    if (pending.status === TaskStatus.Claiming) {
      return true;
    }
    if (pending.status === TaskStatus.Idle) {
      if (delayMs > 0) {
        return true;
      }
      try {
        await taskManagerStart.runSoon(id);
        return true;
      } catch {
        return false;
      }
    }
    // A running bump may already be past the read that would cover this call.
    return false;
  }

  return false;
};

const getTask = async (taskManagerStart: TaskManagerStartContract, id: string) => {
  try {
    return await taskManagerStart.get(id);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};
