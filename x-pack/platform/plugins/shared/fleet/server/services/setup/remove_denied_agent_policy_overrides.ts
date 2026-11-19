/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { agentPolicyStatuses } from '../../../common/constants';
import { sanitizeAgentPolicyOverrides } from '../../../common/services';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';
import type { AgentPolicySOAttributes } from '../../types';
import { agentPolicyService, getAgentPolicySavedObjectType } from '../agent_policy';
import { appContextService } from '../app_context';
import { getSpaceForAgentPolicySO } from '../spaces/helpers';

const BATCH_SIZE = 1000;

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
  try {
    for await (const result of finder.find()) {
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
        await scheduleRedeploy(policySoClient, esClient, id);
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
  );
}

/**
 * The update may have saved the cleaned overrides and then failed to deploy; the next run would
 * skip that policy, leaving the stale deployed revision. Schedule a deploy through the task
 * manager, which retries. The revision is bumped because agents ignore a redeploy of the same one.
 */
async function scheduleRedeploy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string
) {
  try {
    await agentPolicyService.bumpRevision(soClient, esClient, id, { asyncDeploy: true });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`Failed to schedule the redeployment of agent policy [${id}]: ${error.message}`);
  }
}
