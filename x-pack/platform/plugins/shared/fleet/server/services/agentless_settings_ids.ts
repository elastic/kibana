/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, SO_SEARCH_LIMIT } from '../constants';

import type { AgentPolicySOAttributes } from '../types';

import { getAgentPolicySavedObjectType, agentPolicyService } from './agent_policy';
import { agentlessAgentService } from './agents/agentless_agent';
import { fleetServerHostService } from './fleet_server_host';
import { outputService } from './output';

import { appContextService } from '.';

export async function ensureCorrectAgentlessSettingsIds(esClient: ElasticsearchClient) {
  const { outputId: correctOutputId, fleetServerId: correctFleetServerId } =
    agentlessAgentService.getDefaultSettings();

  let fixOutput = false;
  let fixFleetServer = false;

  if (!correctOutputId && !correctFleetServerId) {
    return;
  }

  const agentPolicySavedObjectType = await getAgentPolicySavedObjectType();
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const agentlessOutputIdsToFix = correctOutputId
    ? (
        await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
          type: agentPolicySavedObjectType,
          page: 1,
          perPage: SO_SEARCH_LIMIT,
          filter: `${agentPolicySavedObjectType}.attributes.supports_agentless:true AND NOT ${agentPolicySavedObjectType}.attributes.data_output_id:${correctOutputId}`,
          fields: [`id`],
          namespaces: ['*'],
        })
      )?.saved_objects.map((so) => so.id)
    : [];

  const agentlessFleetServerIdsToFix = correctFleetServerId
    ? (
        await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
          type: agentPolicySavedObjectType,
          page: 1,
          perPage: SO_SEARCH_LIMIT,
          filter: `${agentPolicySavedObjectType}.attributes.supports_agentless:true AND NOT ${agentPolicySavedObjectType}.attributes.fleet_server_host_id:${correctFleetServerId}`,
          fields: [`id`],
          namespaces: ['*'],
        })
      )?.saved_objects.map((so) => so.id)
    : [];

  try {
    // Check that the output ID exists
    if (correctOutputId && agentlessOutputIdsToFix?.length > 0) {
      const output = await outputService.get(
        internalSoClientWithoutSpaceExtension,
        correctOutputId
      );
      fixOutput = output != null;
    }
  } catch (e) {
    // Silently swallow
  }

  try {
    // Check that the fleet server host ID exists
    if (correctFleetServerId && agentlessFleetServerIdsToFix?.length > 0) {
      const fleetServerHost = await fleetServerHostService.get(
        internalSoClientWithoutSpaceExtension,
        correctFleetServerId
      );
      fixFleetServer = fleetServerHost != null;
    }
  } catch (e) {
    // Silently swallow
  }

  const allIdsToFix = Array.from(
    new Set([
      ...(fixOutput ? agentlessOutputIdsToFix : []),
      ...(fixFleetServer ? agentlessFleetServerIdsToFix : []),
    ])
  );

  if (allIdsToFix.length === 0) {
    return;
  }

  appContextService
    .getLogger()
    .debug(
      `Fixing output and/or fleet server host IDs on agent policies: ${agentlessOutputIdsToFix}`
    );

  await pMap(
    allIdsToFix,
    (agentPolicyId) => {
      return agentPolicyService.update(
        internalSoClientWithoutSpaceExtension,
        esClient,
        agentPolicyId,
        {
          data_output_id: correctOutputId,
          fleet_server_host_id: correctFleetServerId,
        },
        {
          force: true,
        }
      );
    },
    {
      concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
    }
  );
}
