/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ElasticsearchClient } from '@kbn/core/server';

import { AGENT_POLICY_INDEX } from '../../../common';

import type { Context, PoliciesRevisionSummaries } from './types';

interface RevisionsToDeleteParams {
  policyId: string;
  revisionIdxCutoff: number;
}

export const deletePolicyRevisions = async (
  esClient: ElasticsearchClient,
  policiesRevisionSummaries: PoliciesRevisionSummaries,
  context: Context
) => {
  const {
    config: { maxRevisions },
    logger,
  } = context;

  const policiesToDelete = Object.entries(policiesRevisionSummaries).reduce<
    RevisionsToDeleteParams[]
  >((acc, [policyId, summary]) => {
    const minUsedRevisionIdxCutoff = summary.minUsedRevision
      ? Math.max(summary.minUsedRevision - maxRevisions, 0)
      : undefined;

    // If we have a minimum used revision, but the max policy offset is less than 1, nothing to delete
    if (minUsedRevisionIdxCutoff === 0) {
      return acc;
    }

    // Favor a cutoff offset based on the min revision used by agents, otherwise use the max idx
    const revisionIdxCutoff = minUsedRevisionIdxCutoff ?? summary.maxRevision - maxRevisions;
    return [...acc, { policyId, revisionIdxCutoff, docCount: summary.count }];
  }, []);

  if (policiesToDelete.length === 0) {
    logger.debug(
      `[FleetPolicyRevisionsCleanupTask] No policy revisions to delete after evaluating agent usage.`
    );
    return;
  }

  return await queryDeletePolicyRevisions(esClient, policiesToDelete, context);
};

const queryDeletePolicyRevisions = async (
  esClient: ElasticsearchClient,
  policiesToDelete: Array<RevisionsToDeleteParams>,
  context: Context
) => {
  if (policiesToDelete.length === 0) {
    return;
  }

  const policyCutoffClauses = policiesToDelete.map(({ policyId, revisionIdxCutoff }) => ({
    bool: {
      must: [
        { term: { policy_id: policyId } },
        { range: { revision_idx: { lte: revisionIdxCutoff } } },
      ],
    },
  }));

  return await esClient.deleteByQuery(
    {
      index: AGENT_POLICY_INDEX,
      max_docs: context.config.maxDocsToDelete,
      conflicts: 'proceed',
      scroll: context.config.timeout,
      scroll_size: 1000,
      wait_for_completion: true,
      query: {
        bool: {
          should: policyCutoffClauses,
        },
      },
    },
    { signal: context.abortController?.signal }
  );
};
