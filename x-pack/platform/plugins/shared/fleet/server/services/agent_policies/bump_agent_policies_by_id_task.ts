/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AuthenticatedUser } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { brandSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { chunk, sortBy, uniqBy } from 'lodash';

import { agentPolicyService, appContextService } from '..';
import { BUMP_AGENT_POLICIES_BATCH_SIZE } from '../../constants';
import { runWithCache } from '../epm/packages/cache';

const TASK_TYPE = 'fleet:bump_agent_policies_by_id';

interface BumpAgentPoliciesByIdTaskParams {
  agentPolicyIdsWithSpace: Array<{ id: string; spaceId: SpaceId }>;
  user?: AuthenticatedUser;
}

export function registerBumpAgentPoliciesByIdTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Bump agent policies revision',
      timeout: '5m',
      maxAttempts: 3,
      paramsSchema: schema.object({
        agentPolicyIdsWithSpace: schema.arrayOf(
          schema.object({
            id: schema.string({ maxLength: 255 }),
            spaceId: schema.string({ maxLength: 255 }),
          }),
          { maxSize: BUMP_AGENT_POLICIES_BATCH_SIZE }
        ),
        user: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      }),
      createTaskRunner: ({ taskInstance, signal }) => {
        return {
          async run() {
            const rawParams = taskInstance.params as {
              agentPolicyIdsWithSpace: Array<{ id: string; spaceId: string }>;
              user?: AuthenticatedUser;
            };
            const params: BumpAgentPoliciesByIdTaskParams = {
              user: rawParams.user,
              agentPolicyIdsWithSpace: rawParams.agentPolicyIdsWithSpace.map(({ id, spaceId }) => ({
                id,
                spaceId: brandSpaceId(spaceId),
              })),
            };
            const { agentPolicyIdsWithSpace, user } = params;

            if (!agentPolicyIdsWithSpace.length) {
              return;
            }
            appContextService
              .getLogger()
              .debug(`Bumping revision of ${agentPolicyIdsWithSpace.length} agent policies`);
            const agentPolicyIdsIndexedBySpace = agentPolicyIdsWithSpace.reduce(
              (acc, { id, spaceId }) => {
                if (!acc[spaceId]) {
                  acc[spaceId] = [];
                }

                acc[spaceId].push(id);

                return acc;
              },
              {} as { [k: string]: string[] }
            );

            await runWithCache(async () => {
              for (const [spaceId, agentPolicyIds] of Object.entries(
                agentPolicyIdsIndexedBySpace
              )) {
                if (signal.aborted) {
                  appContextService
                    .getLogger()
                    .warn('Bump agent policies task was cancelled before completing all spaces');
                  return;
                }
                await agentPolicyService.bumpAgentPoliciesByIds(agentPolicyIds, { user }, spaceId);
              }
            });
          },
        };
      },
    },
  });
}

export async function scheduleBumpAgentPoliciesByIdTask(
  taskManagerStart: TaskManagerStartContract,
  agentPolicyIdsWithSpace: Array<{ id: string; spaceId: string }>,
  user?: AuthenticatedUser
) {
  if (!agentPolicyIdsWithSpace.length) {
    return;
  }

  const sorted = sortBy(agentPolicyIdsWithSpace, 'spaceId');
  const batches = chunk(sorted, BUMP_AGENT_POLICIES_BATCH_SIZE);
  await Promise.all(
    batches.map((batch, index) =>
      taskManagerStart.schedule({
        id: `${TASK_TYPE}:${uuidv4()}`,
        scope: ['fleet'],
        params: { agentPolicyIdsWithSpace: batch, user },
        taskType: TASK_TYPE,
        // Stagger batches 10s apart so the resulting deploys don't spike memory
        runAt: new Date(Date.now() + 3 * 1000 + index * 10 * 1000),
        state: {},
      })
    )
  );
}

/** How long a debounced bump waits for more changes to the same agent policy by default. */
export const DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS = 5_000;

const MAX_DEBOUNCED_SCHEDULE_ATTEMPTS = 3;

export const getDebouncedBumpAgentPolicyTaskId = (agentPolicyId: string) =>
  `${TASK_TYPE}:${agentPolicyId}`;

/**
 * Schedules one bump task per agent policy under an id derived from the policy
 * id, so calls for the same agent policy within `delayMs`, from any Kibana
 * node, share one bump and one redeploy. A bump that cannot be handed to a
 * pending task runs right away, so no change is left undeployed.
 */
export async function scheduleDebouncedBumpAgentPoliciesByIdTask(
  taskManagerStart: TaskManagerStartContract,
  agentPolicyIdsWithSpace: Array<{ id: string; spaceId: string }>,
  { delayMs = DEBOUNCED_BUMP_AGENT_POLICY_DEFAULT_DELAY_MS }: { delayMs?: number } = {}
) {
  await Promise.all(
    uniqBy(agentPolicyIdsWithSpace, 'id').map(async (agentPolicyIdWithSpace) => {
      const { id, spaceId } = agentPolicyIdWithSpace;
      try {
        if (await handOffDebouncedBump(taskManagerStart, agentPolicyIdWithSpace, delayMs)) {
          return;
        }
      } catch (error) {
        appContextService
          .getLogger()
          .warn(
            `Failed to schedule a revision bump for agent policy [${id}], bumping it now: ${error.message}`
          );
      }
      await agentPolicyService.bumpAgentPoliciesByIds([id], undefined, spaceId);
    })
  );
}

/**
 * Returns whether a task bump is guaranteed to run after this call. When it
 * returns false, the caller must bump the agent policy itself.
 */
async function handOffDebouncedBump(
  taskManagerStart: TaskManagerStartContract,
  agentPolicyIdWithSpace: { id: string; spaceId: string },
  delayMs: number
): Promise<boolean> {
  const taskId = getDebouncedBumpAgentPolicyTaskId(agentPolicyIdWithSpace.id);

  for (let attempt = 0; attempt < MAX_DEBOUNCED_SCHEDULE_ATTEMPTS; attempt += 1) {
    try {
      await taskManagerStart.schedule({
        id: taskId,
        scope: ['fleet'],
        params: { agentPolicyIdsWithSpace: [agentPolicyIdWithSpace] },
        taskType: TASK_TYPE,
        runAt: new Date(Date.now() + delayMs),
        state: {},
      });
      return true;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }

    const pending = await getTask(taskManagerStart, taskId);
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
        await taskManagerStart.runSoon(taskId);
        return true;
      } catch {
        return false;
      }
    }
    // A running bump may already be past the read that would cover this call.
    return false;
  }

  return false;
}

async function getTask(taskManagerStart: TaskManagerStartContract, taskId: string) {
  try {
    return await taskManagerStart.get(taskId);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
}
