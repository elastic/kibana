/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coerce, satisfies } from 'semver';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';

import { appContextService } from '../app_context';
import * as AgentService from '../agents';
import type { FleetServerPolicy, FullAgentPolicy, FullAgentPolicyInput } from '../../types';
import { agentPolicyService } from '../agent_policy';
import type { PackageInfo, PackagePolicyAssetsMap } from '../../../common/types';
import { AGENT_POLICY_INDEX, AGENT_POLICY_VERSION_SEPARATOR } from '../../../common/constants';

export async function getAgentVersionsForVersionSpecificPolicies(): Promise<string[]> {
  const commonVersions = [];
  const kibanaVersion = appContextService.getKibanaVersion();
  const coercedKibanaVersion = coerce(kibanaVersion);
  if (coercedKibanaVersion) {
    // current major.minor
    commonVersions.push(`${coercedKibanaVersion.major}.${coercedKibanaVersion.minor}`);
    // previous minor
    if (coercedKibanaVersion.minor > 0) {
      commonVersions.push(`${coercedKibanaVersion.major}.${coercedKibanaVersion.minor - 1}`);
    }
    const availableVersions = await AgentService.getAvailableVersions();
    const previousMajorLatestMinor = availableVersions
      .sort((a, b) => b.localeCompare(a))
      .find((version) => version.startsWith(`${coercedKibanaVersion.major - 1}.`));
    // previous major's latest minor
    if (previousMajorLatestMinor) {
      const coercedPreviousMajorLatestMinor = coerce(previousMajorLatestMinor);
      if (coercedPreviousMajorLatestMinor) {
        commonVersions.push(
          `${coercedPreviousMajorLatestMinor.major}.${coercedPreviousMajorLatestMinor.minor}`
        );
      }
    }
  }
  appContextService
    .getLogger()
    .debug(`Common agent versions for version specific policies: ${commonVersions.join(', ')}`);
  return commonVersions;
}

function getInputsForVersion(inputs: FullAgentPolicyInput[], ver: string) {
  return inputs.filter((input) => {
    return (
      !input.meta?.package?.agentVersion || satisfies(coerce(ver)!, input.meta.package.agentVersion)
    );
  });
}

export async function getVersionSpecificPolicies(
  soClient: SavedObjectsClientContract,
  fleetServerPolicy: FleetServerPolicy,
  fullPolicy: FullAgentPolicy,
  agentVersions?: string[]
): Promise<FleetServerPolicy[]> {
  const fleetServerPolicies: FleetServerPolicy[] = [];

  for (const version of agentVersions ?? (await getAgentVersionsForVersionSpecificPolicies())) {
    let updatedFullPolicy: FullAgentPolicy | null = null;

    // if some of the inputs have template level conditions, we have to recreate the full agent policy with agent version
    if (fullPolicy.inputs.some((input) => !input.meta?.package?.agentVersion)) {
      // read compiled template for agent version from package policy SO
      updatedFullPolicy = await agentPolicyService.getFullAgentPolicy(soClient, fullPolicy.id, {
        agentVersion: version,
      });
    }
    const versionedPolicyId = `${fullPolicy.id}${AGENT_POLICY_VERSION_SEPARATOR}${version}`;
    const versionSpecificPolicy: FleetServerPolicy = {
      ...fleetServerPolicy,
      policy_id: versionedPolicyId,
      data: {
        ...fleetServerPolicy.data,
        // The agent reports the policy id from `data.id` on checkin, so it must carry the
        // version suffix too. Otherwise the agent reports the base id, fleet-server sees a
        // mismatch against the versioned `agent.policy_id`, and the agent churns on
        // POLICY_CHANGE actions every checkin. See https://github.com/elastic/kibana/issues/276294
        id: versionedPolicyId,
        inputs: getInputsForVersion(updatedFullPolicy?.inputs ?? fullPolicy.inputs, version),
      },
    };
    fleetServerPolicies.push(versionSpecificPolicy);
  }

  return fleetServerPolicies;
}

/**
 * Tear down the version-specific policy variants for a parent agent policy that no longer
 * requires them: reassign any agents still on a variant policy (`<parentId>#<version>`) back to
 * the base policy so they keep syncing, then delete the now-stale variant `.fleet-policies`
 * documents.
 *
 * Without this, removing the integration/input that required version-specific policies leaves
 * agents assigned to a variant policy that is never updated again, so they get stuck reporting an
 * outdated policy. See https://github.com/elastic/kibana/issues/276294
 */
export async function reassignAgentsFromVersionSpecificPolicies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  parentPolicyId: string
): Promise<void> {
  const logger = appContextService.getLogger();
  const variantKuery = `policy_id:${escapeKuery(parentPolicyId)}${AGENT_POLICY_VERSION_SEPARATOR}*`;

  const { total } = await AgentService.getAgentsByKuery(esClient, soClient, {
    kuery: variantKuery,
    showInactive: false,
    perPage: 0,
  });
  if (total > 0) {
    logger.info(
      `Reassigning ${total} agents from version-specific policies of ${parentPolicyId} back to the base policy`
    );
    await AgentService.reassignAgents(
      soClient,
      esClient,
      { kuery: variantKuery, showInactive: false },
      parentPolicyId
    );
  }

  await deleteVersionSpecificFleetServerPolicies(esClient, parentPolicyId);
}

/**
 * Delete the version-specific (`<parentId>#<version>`) documents for a parent agent policy from
 * the `.fleet-policies` index. Used when a policy no longer requires version-specific policies so
 * the now-stale variant documents don't linger.
 */
export async function deleteVersionSpecificFleetServerPolicies(
  esClient: ElasticsearchClient,
  parentPolicyId: string
): Promise<void> {
  await esClient.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    query: { prefix: { policy_id: `${parentPolicyId}${AGENT_POLICY_VERSION_SEPARATOR}` } },
    refresh: true,
  });
}

export function hasAgentVersionConditionInInputTemplate(
  assetsMap: PackagePolicyAssetsMap
): boolean {
  let hasVersionConditionInInputTemplate = false;
  assetsMap?.forEach((assetBuffer: Buffer | undefined, assetPath: string) => {
    if (assetPath.endsWith('.hbs') && assetBuffer?.toString().includes('_meta.agent.version')) {
      hasVersionConditionInInputTemplate = true;
    }
  });
  return hasVersionConditionInInputTemplate;
}

export function hasAgentVersionCondition(
  pkgInfo: PackageInfo,
  assetsMap: PackagePolicyAssetsMap
): boolean {
  if (!appContextService.getExperimentalFeatures().enableVersionSpecificPolicies) {
    return false;
  }
  if (pkgInfo.conditions?.agent?.version) {
    return true;
  }
  return hasAgentVersionConditionInInputTemplate(assetsMap);
}
