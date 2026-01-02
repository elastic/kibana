/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ElasticsearchClient } from '@kbn/core/server';

import type { Context, Config } from './types';
import { getPoliciesToClean } from './get_policies_to_clean';
import { populateMinimumRevisionsUsedByAgents } from './populate_minimum_revisions_used_by_agents';
import { deletePolicyRevisions } from './delete_policy_revisions';

const defaultConfig = {
  maxRevisions: 10,
  maxPolicies: 100,
  maxDocsToDelete: 5000,
  timeout: '5m',
};

type ContextParam = Omit<Context, 'config'> & { config?: Partial<Config> };

export const cleanupPolicyRevisions = async (
  esClient: ElasticsearchClient,
  context: ContextParam
) => {
  const { logger, abortController } = context;

  const config = {
    ...defaultConfig,
    ...context.config,
  };

  logger.debug(
    `[FleetPolicyRevisionsCleanupTask] Starting cleanup with max_revisions: ${config.maxRevisions}, max_policies_per_run: ${config.maxPolicies}`
  );

  const policiesToClean = await getPoliciesToClean(esClient, {
    ...context,
    config,
  });

  if (Object.keys(policiesToClean).length === 0) {
    logger.info(
      `[FleetPolicyRevisionsCleanupTask] No policies found with more than ${config.maxRevisions} revisions. Exiting cleanup task.`
    );

    return;
  }

  logger.info(
    `[FleetPolicyRevisionsCleanupTask] Found ${
      Object.keys(policiesToClean).length
    } policies with more than ${config.maxRevisions} revisions.`
  );

  throwIfAborted(abortController);

  const policiesRevisionSummaries = await populateMinimumRevisionsUsedByAgents(
    esClient,
    policiesToClean,
    {
      ...context,
      config,
    }
  );

  throwIfAborted(abortController);

  const docCount = Object.values(policiesRevisionSummaries).reduce(
    (sum, summary) => sum + (summary.count - config.maxRevisions),
    0
  );

  logger.debug(
    `[FleetPolicyRevisionsCleanupTask] Attempting to delete potentially ${
      docCount >= config.maxDocsToDelete ? config.maxDocsToDelete : docCount
    } policy revision documents.`
  );

  const result = await deletePolicyRevisions(esClient, policiesRevisionSummaries, {
    ...context,
    config,
  });

  if (result) {
    logger.debug(
      `[FleetPolicyRevisionsCleanupTask] Deleted ${result.deleted} policy revision documents.`
    );
  }
  logger.debug('[FleetPolicyRevisionsCleanupTask] Cleanup completed');

  return {
    totalDeletedRevisions: result ? result.deleted : 0,
  };
};

export const throwIfAborted = (abortController?: AbortController) => {
  if (abortController?.signal.aborted) {
    throw new Error('Task was aborted');
  }
};
