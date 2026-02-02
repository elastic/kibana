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

import pMap from 'p-map';

import { appContextService } from '..';
import * as AgentService from '../agents';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';
import { throwIfAborted } from '../../tasks/utils';
import { splitVersionSuffixFromPolicyId } from '../../../common/services/version_specific_policies_utils';

const TASK_TYPE = 'fleet:reassign_agents_to_version_specific_policies';

export function registerReassignAgentsToVersionSpecificPoliciesTask(
  taskManagerSetup: TaskManagerSetupContract
) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet reassign agents to version specific policies',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        return {
          async run() {
            const versionSpecificAgentPolicyIds: string[] =
              taskInstance.params.versionSpecificAgentPolicyIds;

            await pMap(
              versionSpecificAgentPolicyIds,
              async (versionedAgentPolicyId) => {
                await reassignAgentsToVersionSpecificPolicies(versionedAgentPolicyId);
                throwIfAborted(abortController);
              },
              {
                concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
              }
            );
          },
        };
      },
    },
  });
}

export async function scheduleReassignAgentsToVersionSpecificPoliciesTask(
  taskManagerStart: TaskManagerStartContract,
  versionSpecificAgentPolicyIds: string[]
) {
  if (versionSpecificAgentPolicyIds.length === 0) {
    return;
  }

  appContextService
    .getLogger()
    .debug(
      `Scheduling reassignment of agents to version specific policies: ${versionSpecificAgentPolicyIds.join(
        ', '
      )}`
    );

  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params: { versionSpecificAgentPolicyIds },
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 1000),
    state: {},
  });
}

export async function reassignAgentsToVersionSpecificPolicies(versionedAgentPolicyId: string) {
  const esClient = appContextService.getInternalUserESClient();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const { baseId: agentPolicyId, version } = splitVersionSuffixFromPolicyId(versionedAgentPolicyId);
  // agents enrolled to parent policy or agents using child policy but upgraded to new version
  const kueryToReassignAgents = `(policy_id:"${agentPolicyId}" AND agent.version:${version}.*) OR (policy_id:${agentPolicyId}* AND agent.version:${version}.* AND upgraded_at:*)`;

  try {
    const { total } = await AgentService.getAgentsByKuery(esClient, soClient, {
      kuery: kueryToReassignAgents,
      showInactive: false,
      perPage: 0,
    });
    if (total === 0) {
      appContextService
        .getLogger()
        .debug(`No agents to reassign for versioned policy ${versionedAgentPolicyId}`);
      return;
    }
  } catch (error) {
    appContextService.getLogger().debug(error);
    return;
  }

  await AgentService.reassignAgents(
    soClient,
    esClient,
    {
      kuery: kueryToReassignAgents,
      showInactive: false,
    },
    versionedAgentPolicyId
  );
}
