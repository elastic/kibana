/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { uniq } from 'lodash';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import { agentPolicyService, appContextService } from '..';
import { runWithCache } from '../epm/packages/cache';
import { getPackagePolicySavedObjectType } from '../package_policy';
import { mapPackagePolicySavedObjectToPackagePolicy } from '../package_policies';
import type { PackagePolicy, PackagePolicySOAttributes } from '../../types';
import { normalizeKuery } from '../saved_object';
import { SO_SEARCH_LIMIT } from '../../constants';

const TASK_TYPE = 'fleet:bump_agent_policies';

export function registerBumpAgentPoliciesTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Bump policies',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        let cancelled = false;
        const isCancelled = () => cancelled;
        return {
          async run() {
            if (isCancelled()) {
              throw new Error('Task has been cancelled');
            }

            await runWithCache(async () => {
              await _updatePackagePoliciesThatNeedBump(appContextService.getLogger(), isCancelled);
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

async function getPackagePoliciesToBump(savedObjectType: string) {
  const result = await appContextService
    .getInternalUserSOClientWithoutSpaceExtension()
    .find<PackagePolicySOAttributes>({
      type: savedObjectType,
      filter: normalizeKuery(savedObjectType, `${savedObjectType}.bump_agent_policy_revision:true`),
      perPage: SO_SEARCH_LIMIT,
      namespaces: ['*'],
      fields: ['id', 'namespaces', 'policy_ids'],
    });
  return {
    total: result.total,
    items: result.saved_objects.map((so) =>
      mapPackagePolicySavedObjectToPackagePolicy(so, so.namespaces)
    ),
  };
}

export async function _updatePackagePoliciesThatNeedBump(
  logger: Logger,
  isCancelled: () => boolean
) {
  const savedObjectType = await getPackagePolicySavedObjectType();
  const packagePoliciesToBump = await getPackagePoliciesToBump(savedObjectType);

  logger.info(
    `Found ${packagePoliciesToBump.total} package policies that need agent policy revision bump`
  );

  const packagePoliciesIndexedBySpace = packagePoliciesToBump.items.reduce((acc, policy) => {
    const spaceId = policy.spaceIds?.[0] ?? DEFAULT_SPACE_ID;
    if (!acc[spaceId]) {
      acc[spaceId] = [];
    }

    acc[spaceId].push(policy);

    return acc;
  }, {} as { [k: string]: PackagePolicy[] });

  const start = Date.now();

  for (const [spaceId, packagePolicies] of Object.entries(packagePoliciesIndexedBySpace)) {
    if (isCancelled()) {
      throw new Error('Task has been cancelled');
    }

    const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
    const esClient = appContextService.getInternalUserESClient();

    await soClient.bulkUpdate<PackagePolicySOAttributes>(
      packagePolicies.map((item) => ({
        type: savedObjectType,
        id: item.id,
        attributes: {
          bump_agent_policy_revision: false,
        },
      }))
    );

    const updatedCount = packagePolicies.length;

    const agentPoliciesToBump = uniq(packagePolicies.map((item) => item.policy_ids).flat());

    await agentPolicyService.bumpAgentPoliciesByIds(soClient, esClient, agentPoliciesToBump);

    logger.debug(
      `Updated ${updatedCount} package policies in space ${spaceId} in ${
        Date.now() - start
      }ms, bump ${agentPoliciesToBump.length} agent policies`
    );
  }
}

export async function scheduleBumpAgentPoliciesTask(taskManagerStart: TaskManagerStartContract) {
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params: {},
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}
