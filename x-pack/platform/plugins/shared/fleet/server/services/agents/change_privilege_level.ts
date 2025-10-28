/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { omit } from 'lodash';

import { FleetUnauthorizedError } from '../../errors';
import { packagePolicyService } from '../package_policy';

import { getCurrentNamespace } from '../spaces/get_current_namespace';

import { SO_SEARCH_LIMIT } from '../../constants';

import type { PackagePolicy } from '../../types';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { getAgentById, getAgents, getAgentsByKuery, openPointInTime } from './crud';
import {
  bulkChangePrivilegeAgentsBatch,
  ChangePrivilegeActionRunner,
} from './change_privilege_runner';

export async function changeAgentPrivilegeLevel(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string,
  options?: {
    user_info?: {
      username?: string;
      groupname?: string;
      password?: string;
    };
  } | null
) {
  // Fail fast if agent contains an integration that requires root access.
  const agent = await getAgentById(esClient, soClient, agentId);
  const packagePolicies =
    (await packagePolicyService.findAllForAgentPolicy(soClient, agent.policy_id || '')) || [];
  const packagesWithRootAccess = getPackagesWithRootAccess(packagePolicies);

  if (packagesWithRootAccess.length > 0) {
    throw new FleetUnauthorizedError(
      `Agent policy ${
        agent.policy_id
      } contains integrations that require root access: ${packagesWithRootAccess
        .map((pkg) => pkg?.name)
        .join(', ')}`
    );
  }

  // Extract password from options if provided and pass it as a secret.
  const res = await createAgentAction(esClient, soClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'PRIVILEGE_LEVEL_CHANGE',
    data: {
      unprivileged: true,
      ...(options?.user_info && { user_info: omit(options?.user_info, ['password']) }),
    },
    ...(options?.user_info?.password && {
      secrets: { user_info: { password: options.user_info.password } },
    }),
  });
  return { actionId: res.id };
}

export async function bulkChangeAgentsPrivilegeLevel(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetAgentsOptions & {
    batchSize?: number;
    actionId?: string;
    total?: number;
    user_info?: {
      username?: string;
      groupname?: string;
      password?: string;
    };
  }
): Promise<{ actionId: string }> {
  const currentSpaceId = getCurrentNamespace(soClient);

  if ('agentIds' in options) {
    const givenAgents = await getAgents(esClient, soClient, options);
    return await bulkChangePrivilegeAgentsBatch(esClient, soClient, givenAgents, {
      ...options,
      spaceId: currentSpaceId,
    });
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;

  const res = await getAgentsByKuery(esClient, soClient, {
    kuery: options.kuery,
    spaceId: currentSpaceId,
    showInactive: false,
    page: 1,
    perPage: batchSize,
  });
  if (res.total <= batchSize) {
    return await bulkChangePrivilegeAgentsBatch(esClient, soClient, res.agents, {
      ...options,
      spaceId: currentSpaceId,
    });
  } else {
    return await new ChangePrivilegeActionRunner(
      esClient,
      soClient,
      {
        ...options,
        batchSize,
        total: res.total,
        spaceId: currentSpaceId,
      },
      { pitId: await openPointInTime(esClient) }
    ).runActionAsyncTask();
  }
}

export function getPackagesWithRootAccess(packagePolicies: PackagePolicy[]) {
  return packagePolicies
    .map((policy) => policy.package)
    .filter((pkg) => pkg && Boolean(pkg?.requires_root));
}
