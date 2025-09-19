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

import { createAgentAction } from './actions';
import { getAgentById } from './crud';

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
  const packagesWithRootAccess = packagePolicies
    .map((policy) => policy.package)
    .filter((pkg) => pkg && pkg.requires_root);
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
