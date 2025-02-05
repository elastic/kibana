/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import { agentPolicyService, appContextService } from '..';
import { runWithCache } from '../epm/packages/cache';

const TASK_TYPE = 'fleet:deploy_agent_policies';

export function registerDeployAgentPoliciesTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Deploy policies',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        const agentPolicyIdsWithSpace: Array<{ id: string; spaceId?: string }> =
          taskInstance.params.agentPolicyIdsWithSpace;
        let cancelled = false;
        return {
          async run() {
            if (!agentPolicyIdsWithSpace.length) {
              return;
            }
            appContextService
              .getLogger()
              .debug(`Deploying ${agentPolicyIdsWithSpace.length} policies`);
            const agentPoliciesIdsIndexedBySpace = agentPolicyIdsWithSpace.reduce(
              (acc, { id, spaceId = DEFAULT_SPACE_ID }) => {
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
                agentPoliciesIdsIndexedBySpace
              )) {
                if (cancelled) {
                  throw new Error('Task has been cancelled');
                }
                await agentPolicyService.deployPolicies(
                  appContextService.getInternalUserSOClientForSpaceId(spaceId),
                  agentPolicyIds
                );
              }
            });
          },
          async cancel() {
            cancelled = true;
          },
        };
      },
    },
  });
}

export async function scheduleDeployAgentPoliciesTask(
  taskManagerStart: TaskManagerStartContract,
  agentPolicyIdsWithSpace: Array<{ id: string; spaceId?: string }>
) {
  if (!agentPolicyIdsWithSpace.length) {
    return;
  }

  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params: { agentPolicyIdsWithSpace },
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}
