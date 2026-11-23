/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ALL_SPACES_ID, DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { agentPolicyStatuses } from '../../../common/constants';
import { sanitizeAgentPolicyOverrides } from '../../../common/services';
import type { AgentPolicySOAttributes } from '../../types';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../agent_policy';
import { appContextService } from '../app_context';

const BATCH_SIZE = 1000;
// Same value as on main; 8.19 has no shared constant for it.
const MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS = 50;

// Same as `getSpaceForAgentPolicySO` on main, which 8.19 doesn't have.
const getSpaceForAgentPolicySO = (agentPolicySO: { namespaces?: string[] }) => {
  const space = agentPolicySO.namespaces?.[0];
  return space && space !== ALL_SPACES_ID ? space : DEFAULT_SPACE_ID;
};

interface AgentPolicyToClean {
  id: string;
  spaceId: string;
}

/**
 * Removes the denied keys (e.g. OpenTelemetry collector keys) from the `overrides` stored on agent
 * policies, and redeploys only those policies.
 *
 * The keys are already stripped when the full agent policy is built, but agents read the policy
 * stored in `.fleet-policies`, which is only rebuilt on the next policy change. Policies saved
 * before the keys were denied would keep delivering them until then.
 *
 * Once cleaned, no policy matches anymore, so later runs only scan the `overrides` and `status`
 * fields. Inactive policies are skipped: they can't be updated, and have no agents to deliver to.
 */
export async function removeDeniedAgentPolicyOverrides(esClient: ElasticsearchClient) {
  const logger = appContextService.getLogger();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  // `overrides` is mapped as `flattened` with `index: false`, so it can't be filtered in a query.
  const finder = soClient.createPointInTimeFinder<AgentPolicySOAttributes>({
    type: await getAgentPolicySavedObjectType(),
    fields: ['overrides', 'status'],
    perPage: BATCH_SIZE,
    namespaces: ['*'],
  });

  const policiesToClean: AgentPolicyToClean[] = [];
  let scannedCount = 0;
  try {
    for await (const result of finder.find()) {
      scannedCount += result.saved_objects.length;
      for (const so of result.saved_objects) {
        // With `fields`, a policy without `overrides` comes back with no `attributes` at all.
        if (!so.attributes?.overrides || so.attributes.status === agentPolicyStatuses.Inactive) {
          continue;
        }
        const { removedKeys } = sanitizeAgentPolicyOverrides(so.attributes.overrides);
        if (removedKeys.length > 0) {
          policiesToClean.push({ id: so.id, spaceId: getSpaceForAgentPolicySO(so) });
        }
      }
    }
  } finally {
    await finder.close();
  }

  // Every setup scans all agent policies, so this shows operators of large fleets what it costs
  logger.debug(
    `Scanned ${scannedCount} agent policies, ${policiesToClean.length} with disallowed overrides`
  );

  if (policiesToClean.length === 0) {
    return;
  }

  await pMap(
    policiesToClean,
    async ({ id, spaceId }) => {
      const policySoClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
      let removedKeys: string[] = [];
      try {
        // Sanitize the current overrides, not the ones seen by the scan, so an edit made since
        // then is kept. `overrides` is a flattened field, so the update replaces it.
        const current = await agentPolicyService.get(policySoClient, id, false);
        const sanitized = sanitizeAgentPolicyOverrides(current?.overrides ?? {});
        removedKeys = sanitized.removedKeys;
        if (removedKeys.length === 0) {
          return;
        }
        await agentPolicyService.update(
          policySoClient,
          esClient,
          id,
          { overrides: sanitized.overrides },
          { force: true, skipValidation: true }
        );
        logger.warn(
          `Removed disallowed overrides [${removedKeys.join(', ')}] from agent policy [${id}]`
        );
      } catch (error) {
        // Not fatal for setup: the keys are still stripped whenever the policy is next deployed.
        logger.error(
          `Failed to remove disallowed overrides from agent policy [${id}]: ${error.message}`
        );
        await scheduleRedeployIfSaved(policySoClient, esClient, id);
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
  );
}

/**
 * The update may have saved the cleaned overrides and then failed to deploy; the next run would
 * skip that policy, leaving the stale deployed revision. Schedule a deploy through the task
 * manager, which retries. The revision is bumped because agents ignore a redeploy of the same one.
 *
 * Only done when the stored overrides are clean, which confirms the save went through. Otherwise
 * the next setup retries the whole cleanup, and bumping here would redeploy on every run.
 */
async function scheduleRedeployIfSaved(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string
) {
  try {
    const current = await agentPolicyService.get(soClient, id, false);
    if (!current || sanitizeAgentPolicyOverrides(current.overrides ?? {}).removedKeys.length > 0) {
      return;
    }
    await agentPolicyService.bumpRevision(soClient, esClient, id, { asyncDeploy: true });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`Failed to schedule the redeployment of agent policy [${id}]: ${error.message}`);
  }
}
