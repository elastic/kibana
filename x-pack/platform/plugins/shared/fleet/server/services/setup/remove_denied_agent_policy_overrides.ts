/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';

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
  overrides: Record<string, any>;
  removedKeys: string[];
}

/**
 * Removes the denied keys (e.g. OpenTelemetry collector keys) from the `overrides` stored on agent
 * policies, and redeploys only those policies.
 *
 * The keys are already stripped when the full agent policy is built, but agents read the policy
 * stored in `.fleet-policies`, which is only rebuilt on the next policy change. Policies saved
 * before the keys were denied would keep delivering them until then.
 *
 * Once cleaned, no policy matches anymore, so later runs only scan the `overrides` field.
 */
export async function removeDeniedAgentPolicyOverrides(esClient: ElasticsearchClient) {
  const logger = appContextService.getLogger();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  // `overrides` is mapped as `flattened` with `index: false`, so it can't be filtered in a query.
  const finder = soClient.createPointInTimeFinder<AgentPolicySOAttributes>({
    type: await getAgentPolicySavedObjectType(),
    fields: ['overrides'],
    perPage: BATCH_SIZE,
    namespaces: ['*'],
  });

  const policiesToClean: AgentPolicyToClean[] = [];
  try {
    for await (const result of finder.find()) {
      for (const so of result.saved_objects) {
        if (!so.attributes.overrides) {
          continue;
        }
        const { overrides, removedKeys } = sanitizeAgentPolicyOverrides(so.attributes.overrides);
        if (removedKeys.length > 0) {
          policiesToClean.push({
            id: so.id,
            spaceId: getSpaceForAgentPolicySO(so),
            overrides,
            removedKeys,
          });
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
    async ({ id, spaceId, overrides, removedKeys }) => {
      try {
        // `overrides` is a flattened field, so the update replaces it instead of merging into it.
        await agentPolicyService.update(
          appContextService.getInternalUserSOClientForSpaceId(spaceId),
          esClient,
          id,
          { overrides },
          { force: true, skipValidation: true }
        );
        logger.warn(
          `Removed disallowed overrides [${removedKeys.join(', ')}] from agent policy [${id}]`
        );
      } catch (error) {
        // Not fatal for setup: the keys are still stripped whenever the policy is next deployed.
        logger.error(
          `Failed to remove disallowed overrides [${removedKeys.join(
            ', '
          )}] from agent policy [${id}]: ${error.message}`
        );
      }
    },
    { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
  );
}
