/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { omit } from 'lodash';

import pMap from 'p-map';

import type { Agent } from '../../types';

import { packagePolicyService } from '../package_policy';

import { FleetUnauthorizedError } from '../../errors';

import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';

import { createAgentAction, createErrorActionResults } from './actions';

import { getPackagesWithRootAccess } from './change_privilege_level';

export class ChangePrivilegeActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await BulkChangePrivilegeAgentsBatch(
      this.esClient,
      this.soClient,
      agents,
      this.actionParams!
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.PRIVILEGE_LEVEL_CHANGE_RETRY;
  }

  protected getActionType() {
    return 'PRIVILEGE_LEVEL_CHANGE';
  }
}

export async function BulkChangePrivilegeAgentsBatch(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    user_info?: {
      username?: string;
      groupname?: string;
      password?: string;
    };
  }
) {
  const errors: Record<Agent['id'], Error> = {};
  const now = new Date().toISOString();

  const agentsToAction: Agent[] = [];

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? agents.length;
  const agentIds = agentsToAction.map((agent) => agent.id);

  // Fail fast if agent policies contain an integration that requires root access.
  if (agents.length > 0) {
    const agentPolicyIds = agents.map((agent) => agent.policy_id);
    await pMap(
      agentPolicyIds,
      async (agentPolicyId) => {
        if (agentPolicyId) {
          const allPackagePolicies =
            (await packagePolicyService.findAllForAgentPolicy(soClient, agentPolicyId)) || [];
          const packagesWithRootAccess = getPackagesWithRootAccess(allPackagePolicies);
          if (packagesWithRootAccess.length > 0) {
            throw new FleetUnauthorizedError(
              `Agent policy ${agentPolicyId} contains integrations that require root access: ${packagesWithRootAccess
                .map((pkg) => pkg?.name)
                .join(', ')}`
            );
          }
        }
        return undefined;
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
    );
  }

  // Extract password from options if provided and pass it as a secret.
  const res = await createAgentAction(esClient, soClient, {
    id: actionId,
    agents: agentIds,
    created_at: now,
    type: 'PRIVILEGE_LEVEL_CHANGE',
    total,
    data: {
      unprivileged: true,
      ...(options?.user_info && { user_info: omit(options?.user_info, ['password']) }),
    },
    ...(options?.user_info?.password && {
      secrets: { user_info: { password: options.user_info.password } },
    }),
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'agent does not support privilege change action'
  );

  return { actionId: res.id };
}
