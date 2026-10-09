/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import pMap from 'p-map';

import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../constants';

import type { AgentPolicy } from '../types';

import { getAgentPolicySavedObjectType, agentPolicyService } from './agent_policy';
import { agentlessAgentService } from './agents/agentless_agent';
import { fleetServerHostService } from './fleet_server_host';
import { outputService } from './output';
import { packagePolicyService } from './package_policy';

import { appContextService } from '.';

// Kept small (matches upgradeManagedPackagePolicies' perPage of 50) since each policy in a
// page triggers its own findAllForAgentPolicy read and, if it needs fixing, an update — a
// large page size would fan out many ES requests at once.
const FETCH_PAGE_SIZE = 50;

// Cache the pending Promise (not the resolved value) so concurrent pMap workers asking for the
// same output ID share one in-flight request rather than each issuing their own.
function createOutputExistsCache(): (outputId: string) => Promise<boolean> {
  const cache = new Map<string, Promise<boolean>>();
  return (outputId: string): Promise<boolean> => {
    if (!cache.has(outputId)) {
      cache.set(
        outputId,
        outputService
          .get(outputId)
          .then((output) => output != null)
          .catch(() => false)
      );
    }
    return cache.get(outputId)!;
  };
}

interface PolicyEvalContext {
  soClient: SavedObjectsClientContract;
  correctFleetServerId: string;
  correctFleetServerIdExists: boolean;
  outputExists: (outputId: string) => Promise<boolean>;
}

async function evaluatePolicyAttributes(
  agentPolicy: AgentPolicy,
  ctx: PolicyEvalContext
): Promise<Partial<AgentPolicy>> {
  // Fetched per policy, scoped to this page (bounded by FETCH_PAGE_SIZE), so this never
  // holds package policies for more than one page of agent policies at a time.
  const packagePolicies = await packagePolicyService.findAllForAgentPolicy(
    ctx.soClient,
    agentPolicy.id,
    { spaceIds: ['*'] }
  );
  const correctOutputId = agentlessAgentService.getDefaultOutputId({
    package_policies: packagePolicies,
  });
  const attributes: Partial<AgentPolicy> = {};

  if (
    correctOutputId &&
    (agentPolicy.data_output_id !== correctOutputId ||
      agentPolicy.monitoring_output_id !== correctOutputId) &&
    (await ctx.outputExists(correctOutputId))
  ) {
    attributes.data_output_id = correctOutputId;
    attributes.monitoring_output_id = correctOutputId;
  }

  if (
    ctx.correctFleetServerIdExists &&
    agentPolicy.fleet_server_host_id !== ctx.correctFleetServerId
  ) {
    attributes.fleet_server_host_id = ctx.correctFleetServerId;
  }

  return attributes;
}

async function getAgentPolicyUpdates(
  agentPolicies: AgentPolicy[],
  ctx: PolicyEvalContext
): Promise<Array<{ id: string; attributes: Partial<AgentPolicy> }>> {
  const updates: Array<{ id: string; attributes: Partial<AgentPolicy> }> = [];

  await pMap(
    agentPolicies,
    async (agentPolicy) => {
      try {
        const attributes = await evaluatePolicyAttributes(agentPolicy, ctx);
        if (Object.keys(attributes).length > 0) {
          updates.push({ id: agentPolicy.id, attributes });
        }
      } catch (e) {
        // Skip this policy rather than aborting the whole page/migration — it will be
        // retried on the next Kibana startup.
        appContextService
          .getLogger()
          .error(
            `Failed to evaluate agentless settings for agent policy ${agentPolicy.id}: ${e.message}`
          );
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
  );

  return updates;
}

async function applyPolicyUpdates(
  updates: Array<{ id: string; attributes: Partial<AgentPolicy> }>,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  if (updates.length === 0) {
    return;
  }

  appContextService
    .getLogger()
    .debug(
      `Fixing output and/or fleet server host IDs on agent policies: ${updates
        .map(({ id }) => id)
        .join(', ')}`
    );

  await pMap(
    updates,
    async ({ id, attributes }) => {
      try {
        await agentPolicyService.update(soClient, esClient, id, attributes, { force: true });
      } catch (e) {
        appContextService
          .getLogger()
          .error(`Failed to update agentless settings for agent policy ${id}: ${e.message}`);
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
  );
}

export async function ensureCorrectAgentlessSettingsIds(esClient: ElasticsearchClient) {
  const correctFleetServerId = agentlessAgentService.getDefaultFleetServerId();

  if (!correctFleetServerId) {
    // Self-managed: no agentless output/fleet server routing applies.
    return;
  }

  const agentPolicySavedObjectType = await getAgentPolicySavedObjectType();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const correctFleetServerIdExists = await fleetServerHostService
    .get(correctFleetServerId)
    .then((fleetServerHost) => fleetServerHost != null)
    .catch(() => false);

  const ctx: PolicyEvalContext = {
    soClient,
    correctFleetServerId,
    correctFleetServerIdExists,
    outputExists: createOutputExistsCache(),
  };

  // PIT-backed pagination so this scales to any number of agentless policies without holding
  // more than one page in memory at a time.
  const agentPolicyPages = await agentPolicyService.fetchAllAgentPolicies(soClient, {
    kuery: `${agentPolicySavedObjectType}.supports_agentless:true`,
    fields: ['id', 'data_output_id', 'monitoring_output_id', 'fleet_server_host_id'],
    spaceId: '*',
    perPage: FETCH_PAGE_SIZE,
  });

  for await (const agentPolicies of agentPolicyPages) {
    const updates = await getAgentPolicyUpdates(agentPolicies, ctx);
    await applyPolicyUpdates(updates, soClient, esClient);
  }
}
