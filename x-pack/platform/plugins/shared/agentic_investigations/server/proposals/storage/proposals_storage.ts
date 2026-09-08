/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { PROPOSALS_INDEX_NAME } from '../../../common/proposals/constants';
import type { Proposal } from '../../../common/proposals/proposal';

const storageSettings = {
  name: PROPOSALS_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      comment: types.text({}),

      actionWorkflowId: types.keyword({}),
      // Shapes vary per action workflow and are never the query surface;
      // `targetEntities` is. Flattened keeps them queryable-enough without a
      // per-action mapping.
      actionInput: types.flattened({}),

      status: types.keyword({}),
      impact: types.keyword({}),
      confidence: types.keyword({}),
      category: types.keyword({}),
      targetEntities: types.keyword({}),
      origin: types.keyword({}),
      expiresAt: types.date({}),

      decidedBy: types.keyword({}),
      decidedAt: types.date({}),
      dismissReason: types.keyword({}),
      rationale: types.text({}),
      executionError: types.text({}),

      workflowExecutionId: types.keyword({}),
      supersedesProposalId: types.keyword({}),

      createdAt: types.date({}),
      createdBy: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type ProposalsStorageSettings = typeof storageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type ProposalDocument = Omit<Proposal, 'id'>;

export type ProposalsStorageClient = IStorageClient<ProposalsStorageSettings, ProposalDocument>;

export const createProposalsStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ProposalsStorageClient => {
  const adapter = new StorageIndexAdapter<ProposalsStorageSettings, ProposalDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};
