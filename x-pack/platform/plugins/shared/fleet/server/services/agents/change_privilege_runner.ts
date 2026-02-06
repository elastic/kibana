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
import {
  MINIMUM_PRIVILEGE_LEVEL_CHANGE_AGENT_VERSION,
  isAgentPrivilegeLevelChangeSupported,
} from '../../../common/services';
import type { AgentPrivilegeLevelChangeUserInfo } from '../../../common/types';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import { createAgentAction, createErrorActionResults } from './actions';
import { getPackagesWithRootPrivilege } from './change_privilege_level';

export class ChangePrivilegeActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await bulkChangePrivilegeAgentsBatch(
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

export async function bulkChangePrivilegeAgentsBatch(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    spaceId?: string;
    user_info?: AgentPrivilegeLevelChangeUserInfo;
  }
) {
  const errors: Record<Agent['id'], Error> = {};
  const now = new Date().toISOString();

  const agentsToAction: Agent[] = [];

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? agents.length;
  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];

  await pMap(
    agents,
    async (agent) => {
      // Create error if agent is on an unsupported version.
      if (!isAgentPrivilegeLevelChangeSupported(agent)) {
        errors[agent.id] = new FleetUnauthorizedError(
          `Cannot remove root privilege. Privilege level change is supported from version ${MINIMUM_PRIVILEGE_LEVEL_CHANGE_AGENT_VERSION}.`
        );
        return;
      }
      if (agent?.policy_id) {
        const allPackagePolicies =
          (await packagePolicyService.findAllForAgentPolicy(soClient, agent.policy_id)) || [];
        const packagesWithRootPrivilege = getPackagesWithRootPrivilege(allPackagePolicies);
        // Create error if agent contains an integration that requires root privilege.
        if (packagesWithRootPrivilege.length > 0) {
          errors[agent.id] = new FleetUnauthorizedError(
            `Agent ${agent.id} is on policy ${
              agent.policy_id
            }, which contains integrations that require root privilege: ${packagesWithRootPrivilege
              .map((pkg) => pkg?.name)
              .join(', ')}`
          );
        } else {
          agentsToAction.push(agent);
        }
      } else {
        agentsToAction.push(agent);
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
  );
  const agentIds = agentsToAction.map((agent) => agent.id);

  // Create action to change the privilege level of eligible agents.
  // Extract password from options if provided and pass it as a secret.
  await createAgentAction(esClient, soClient, {
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
      namespaces,
    }),
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'agent does not support privilege change action'
  );

  return { actionId };
}
