/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AuthenticatedUser } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { chunk } from 'lodash';

import { agentPolicyService, appContextService } from '..';
import { BUMP_AGENT_POLICIES_BATCH_SIZE } from '../../constants';
import { runWithCache } from '../epm/packages/cache';

const TASK_TYPE = 'fleet:bump_agent_policies_by_id';

export function registerBumpAgentPoliciesByIdTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Bump agent policies revision',
      timeout: '5m',
      maxAttempts: 3,
      paramsSchema: schema.object({
        agentPolicyIdsWithSpace: schema.arrayOf(
          schema.object({ id: schema.string(), spaceId: schema.string() })
        ),
        user: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      }),
      createTaskRunner: ({ taskInstance, abortController }) => {
        return {
          async run() {
            const { agentPolicyIdsWithSpace, user } = taskInstance.params as {
              agentPolicyIdsWithSpace: Array<{ id: string; spaceId: string }>;
              user?: AuthenticatedUser;
            };

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
                if (abortController.signal.aborted) {
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

  const batches = chunk(agentPolicyIdsWithSpace, BUMP_AGENT_POLICIES_BATCH_SIZE);
  await Promise.all(
    batches.map((batch) =>
      taskManagerStart.schedule({
        id: `${TASK_TYPE}:${uuidv4()}`,
        scope: ['fleet'],
        params: { agentPolicyIdsWithSpace: batch, user },
        taskType: TASK_TYPE,
        runAt: new Date(Date.now() + 3 * 1000),
        state: {},
      })
    )
  );
}
