/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { OTLP_MINIMUM_FLEET_SERVER_VERSION, SO_SEARCH_LIMIT } from '../../../common/constants';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../agent_policy';
import { appContextService } from '../app_context';
import { isFleetServerVersionRequirementMet } from '../fleet_server/version_requirements';

/** Returns true when all enrolled Fleet Servers meet the OTLP output minimum version. */
export async function isOtlpOutputSupported(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  return isFleetServerVersionRequirementMet({
    esClient,
    soClient,
    featureName: 'OTLP output',
    minimumFleetServerVersion: OTLP_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'otlp_output_requirements_met',
  });
}

/**
 * Checks whether OTLP output is permitted in this deployment.
 * Returns { result: true } when allowed, or { result: false, error } with a human-readable
 * reason when not — letting callers surface the reason without catching exceptions.
 */
export async function checkOtlpOutputAllowed(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<{ result: boolean; error?: string }> {
  if (!appContextService.getExperimentalFeatures().enableOtlpOutput) {
    return { result: false, error: 'OTLP output type is not enabled' };
  }

  if (!(await isOtlpOutputSupported(esClient, soClient))) {
    return {
      result: false,
      error: `OTLP output requires all Fleet Servers to be on version ${OTLP_MINIMUM_FLEET_SERVER_VERSION} or later.`,
    };
  }

  return { result: true };
}

// Returns agentless policies that may need their data output ID updated
// If outputId is provided, return agentless policies that use that output in addition
// to policies that don't have an output set
export async function findAgentlessPolicies(outputId?: string) {
  const internalSoClientWithoutSpaceExtension =
    appContextService.getInternalUserSOClientWithoutSpaceExtension();

  const agentlessPolicies = await agentPolicyService.list(internalSoClientWithoutSpaceExtension, {
    spaceId: '*',
    perPage: SO_SEARCH_LIMIT,
    kuery: `${await getAgentPolicySavedObjectType()}.supports_agentless:true`,
  });

  if (outputId) {
    return agentlessPolicies.items.filter(
      (policy) => policy.data_output_id === outputId || !policy.data_output_id
    );
  } else {
    return agentlessPolicies.items.filter((policy) => !policy.data_output_id);
  }
}
