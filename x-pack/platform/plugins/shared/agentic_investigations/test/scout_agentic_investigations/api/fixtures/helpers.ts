/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import type { Client } from '@elastic/elasticsearch';
import { COMMON_HEADERS } from './constants';

const PROPOSALS_PATH = 'internal/investigations/proposals';
const PROPOSALS_INDEX_ALIAS = '.kibana-investigation-proposals';
const PROPOSALS_WRITE_INDEX = `${PROPOSALS_INDEX_ALIAS}-000001`;

const IMPACT_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Guards against the same race every seed in this suite would otherwise hit:
 * an `esClient.index()`/`update()` call against an alias that does not exist
 * yet either auto-creates a *plain* index with that literal name (colliding
 * with the alias the plugin's own `StorageIndexAdapter` tries to create on
 * its first real write — `invalid_alias_name_exception`) or, if it does hit
 * the adapter first, writes with no explicit mapping at all under
 * `dynamic: 'strict'`'s absence. Installing the same index template the
 * adapter installs (see `proposals_storage.ts` for the mapping this mirrors)
 * before any write sidesteps both: idempotent (`create: false`), and later
 * calls from the plugin itself just find it already there and no-op.
 */
let indexReady: Promise<void> | undefined;
const ensureProposalsIndex = (esClient: Client): Promise<void> => {
  if (!indexReady) {
    indexReady = esClient.indices
      .putIndexTemplate({
        name: PROPOSALS_INDEX_ALIAS,
        create: false,
        allow_auto_create: false,
        index_patterns: [`${PROPOSALS_INDEX_ALIAS}-*`],
        template: {
          mappings: {
            dynamic: 'strict',
            properties: {
              spaceId: { type: 'keyword' },
              conversationId: { type: 'keyword' },
              comment: { type: 'text' },
              actionWorkflowId: { type: 'keyword' },
              actionInput: { type: 'flattened' },
              status: { type: 'keyword' },
              decision: { type: 'keyword' },
              supersededBy: { type: 'keyword' },
              rootProposalId: { type: 'keyword' },
              supersedes: { type: 'keyword' },
              revision: { type: 'long' },
              impact: { type: 'keyword' },
              confidence: { type: 'keyword' },
              category: { type: 'keyword' },
              origin: { type: 'keyword' },
              expiresAt: { type: 'date', format: 'strict_date_optional_time' },
              impactRank: { type: 'byte' },
              confidenceRank: { type: 'byte' },
              decidedBy: {
                type: 'object',
                properties: {
                  username: { type: 'keyword' },
                  fullName: { type: 'keyword' },
                  email: { type: 'keyword' },
                  profileUid: { type: 'keyword' },
                },
              },
              decidedAt: { type: 'date', format: 'strict_date_optional_time' },
              dismissReason: { type: 'keyword' },
              rationale: { type: 'text' },
              executionError: { type: 'text' },
              workflowExecutionId: { type: 'keyword' },
              createdAt: { type: 'date', format: 'strict_date_optional_time' },
              createdBy: {
                type: 'object',
                properties: {
                  username: { type: 'keyword' },
                  fullName: { type: 'keyword' },
                  email: { type: 'keyword' },
                  profileUid: { type: 'keyword' },
                },
              },
            },
          },
          aliases: { [PROPOSALS_INDEX_ALIAS]: { is_write_index: true } },
        },
      })
      .then(() =>
        esClient.indices
          .create({ index: PROPOSALS_WRITE_INDEX })
          .catch((error: { statusCode?: number }) => {
            if (error?.statusCode === 400) {
              return; // resource_already_exists_exception — another worker won the race.
            }
            throw error;
          })
      )
      .then(() => undefined);
  }
  return indexReady;
};

export interface SeedProposalOptions {
  conversationId?: string;
  comment?: string;
  impact?: string;
  confidence?: string;
  /** Overrides the seeded status away from `pending` — e.g. to prove a route
   * rejects revising something already settled, without needing a real
   * workflow execution to transition it there. */
  status?: string;
}

export const seedProposal = async (
  esClient: Client,
  options: SeedProposalOptions = {}
): Promise<{ id: string }> => {
  await ensureProposalsIndex(esClient);

  const impact = options.impact ?? 'low';
  const confidence = options.confidence ?? 'medium';
  const now = new Date().toISOString();

  // There is no create-via-HTTP route on purpose (see `register_routes.ts`):
  // a proposal's decision is written behind its gate, so one created
  // without a gate execution could never be decided — only the workflow's
  // `proposals.createProposal` step, which knows the execution id to stamp,
  // is allowed to make one. A Scout suite has no workflow execution to
  // drive, so it seeds the one thing an HTTP-only test double genuinely
  // cannot get any other way: a document shaped exactly like `create()`
  // would write, indexed directly through the same alias the storage
  // adapter reads and writes (`.kibana-investigation-proposals`).
  const response = await esClient.index({
    index: PROPOSALS_INDEX_ALIAS,
    document: {
      spaceId: 'default',
      conversationId: options.conversationId ?? `scout-conversation-${Date.now()}`,
      comment: options.comment ?? 'Seeded by the revisions Scout suite',
      status: options.status ?? 'pending',
      rootProposalId: undefined,
      impact,
      confidence,
      impactRank: IMPACT_RANK[impact],
      confidenceRank: CONFIDENCE_RANK[confidence],
      category: 'tune',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      workflowExecutionId: `scout-fake-execution-${Date.now()}`,
      createdAt: now,
    },
    refresh: 'wait_for',
  });
  const id = response._id;
  // `rootProposalId` defaults to the document's own id on the root, exactly
  // like `ProposalsService.create()` stamps it — done as a follow-up update
  // since the id is not known until after the first index call.
  await esClient.update({
    index: PROPOSALS_INDEX_ALIAS,
    id,
    doc: { rootProposalId: id },
    refresh: 'wait_for',
  });
  return { id };
};

export const getProposal = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string
): Promise<ApiClientResponse> =>
  apiClient.get(`${PROPOSALS_PATH}/${id}`, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const reviseProposal = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: Record<string, unknown> = {}
): Promise<ApiClientResponse> =>
  apiClient.post(`${PROPOSALS_PATH}/${id}/revisions`, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

export const dismissProposal = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: Record<string, unknown> = { dismissReason: 'other' }
): Promise<ApiClientResponse> =>
  apiClient.post(`${PROPOSALS_PATH}/${id}/dismiss`, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });


