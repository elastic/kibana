/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import {
  MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
  SO_SEARCH_LIMIT,
  DEFAULT_OUTPUT_ID,
  SERVERLESS_DEFAULT_OUTPUT_ID,
  DEFAULT_FLEET_SERVER_HOST_ID,
  SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID,
} from '../constants';

import type { AgentPolicySOAttributes } from '../types';

import { getAgentPolicySavedObjectType } from './agent_policy';

import { appContextService } from '.';
import { agentPolicyService } from './agent_policy';

export async function ensureCorrectAgentlessSettingsIds(esClient: ElasticsearchClient) {
  const cloudSetup = appContextService.getCloud();
  const isCloud = cloudSetup?.isCloudEnabled;
  const isServerless = cloudSetup?.isServerlessEnabled;
  const correctOutputId = isServerless
    ? SERVERLESS_DEFAULT_OUTPUT_ID
    : isCloud
    ? DEFAULT_OUTPUT_ID
    : undefined;
  const correctFleetServerId = isServerless
    ? SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID
    : isCloud
    ? DEFAULT_FLEET_SERVER_HOST_ID
    : undefined;

  if (!correctOutputId) {
    return;
  }

  const agentPolicySavedObjectType = await getAgentPolicySavedObjectType();
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const agentlessOutputIdsToFix = (
    await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
      type: agentPolicySavedObjectType,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      filter: `${agentPolicySavedObjectType}.attributes.supports_agentless:true AND NOT ${agentPolicySavedObjectType}.attributes.data_output_id:${correctOutputId}`,
      fields: [`id`],
      namespaces: ['*'],
    })
  )?.saved_objects.map((so) => so.id);
  const agentlessFleetServerIdsToFix = (
    await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
      type: agentPolicySavedObjectType,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      filter: `${agentPolicySavedObjectType}.attributes.supports_agentless:true AND NOT ${agentPolicySavedObjectType}.attributes.fleet_server_host_id:${correctFleetServerId}`,
      fields: [`id`],
      namespaces: ['*'],
    })
  )?.saved_objects.map((so) => so.id);

  const allIdsToFix = Array.from(
    new Set([...(agentlessOutputIdsToFix ?? []), ...(agentlessFleetServerIdsToFix ?? [])])
  );

  if (agentlessOutputIdsToFix.length === 0 && agentlessFleetServerIdsToFix.length === 0) {
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
        }
      );
    },
    {
      concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
    }
  );
}
