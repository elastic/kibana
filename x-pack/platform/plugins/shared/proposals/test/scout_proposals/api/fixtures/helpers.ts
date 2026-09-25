/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import type { Client } from '@elastic/elasticsearch';
import { COMMON_HEADERS } from './constants';

const PROPOSALS_PATH = 'internal/proposals';
const PROPOSALS_INDEX_ALIAS = '.kibana-proposals';
const PROPOSALS_WRITE_INDEX = `${PROPOSALS_INDEX_ALIAS}-000001`;

const IMPACT_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Same convention as the Agent Builder spaces suite: the default Space is
 * reached unprefixed, every other Space through its `/s/<space>` prefix.
 */
export const spaceUrl = (url: string, spaceId: string): string =>
  spaceId && spaceId !== 'default' ? `/s/${spaceId}/${url}` : `/${url}`;

/**
 * Installs the same index template the plugin's `StorageIndexAdapter` does
 * (mapping mirrors `proposals_storage.ts`). Without it, seeding against a
 * not-yet-created alias auto-creates a plain index of that name, which then
 * collides with the adapter's alias (`invalid_alias_name_exception`).
 *
 * Removed again by `cleanupProposalFixtures`: `create: false` overwrites an
 * application-owned template, so leaving it behind leaks into later suites.
 */
let indexReady: Promise<void> | undefined;
let templateExistedBeforeSuite = false;
let indexCreatedBySuite = false;

const ensureProposalsIndex = (esClient: Client): Promise<void> => {
  if (!indexReady) {
    indexReady = esClient.indices
      .existsIndexTemplate({ name: PROPOSALS_INDEX_ALIAS })
      .then((exists) => {
        templateExistedBeforeSuite = Boolean(exists);
      })
      .catch(() => {
        // A stack too old for the `_index_template` API still gets the
        // template; the suite just cannot claim to have created it.
        templateExistedBeforeSuite = true;
      })
      .then(() =>
        esClient.indices.putIndexTemplate({
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
      )
      .then(() =>
        esClient.indices
          .create({ index: PROPOSALS_WRITE_INDEX })
          .then(() => {
            indexCreatedBySuite = true;
          })
          .catch(
            (error: {
              statusCode?: number;
              body?: { error?: { type?: string } };
              meta?: { statusCode?: number; body?: { error?: { type?: string } } };
            }) => {
              // Only the concurrent-create race is benign; any other 400 means the
              // write target is not the alias this seed assumes.
              const type = error?.body?.error?.type ?? error?.meta?.body?.error?.type;
              // Read the status from both locations for the same reason
              // `isNotFound` below does: the client surfaces it at `meta.statusCode`
              // on a `ResponseError`, so checking only the top level would rethrow
              // the benign race and make this suite flaky on a shared server.
              const statusCode = error?.statusCode ?? error?.meta?.statusCode;
              if (statusCode === 400 && type === 'resource_already_exists_exception') {
                return;
              }
              throw error;
            }
          )
      )
      .then(() => undefined);
  }
  return indexReady;
};

/**
 * Seeded roots plus every revision the routes minted from them: `revise()`
 * creates ids server-side, so callers must hand them back via `trackProposal`.
 */
const trackedProposalIds = new Set<string>();

export const trackProposal = (id?: string): string | undefined => {
  // Tolerates an absent id so a caller can track before asserting the status
  // that would guarantee one: a revision can exist even when the request failed.
  if (typeof id === 'string' && id.length > 0) {
    trackedProposalIds.add(id);
  }
  return id;
};

const isNotFound = (error: unknown): boolean => {
  const statusCode =
    (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode ??
    (error as { meta?: { statusCode?: number } })?.meta?.statusCode;
  return statusCode === 404;
};

/**
 * Removes everything this suite put into the stack, so a rerun starts from the
 * same state as the first run. Called from the specs' `afterAll`.
 */
export const cleanupProposalFixtures = async (esClient: Client): Promise<void> => {
  for (const id of trackedProposalIds) {
    try {
      await esClient.delete({ index: PROPOSALS_INDEX_ALIAS, id, refresh: 'wait_for' });
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  trackedProposalIds.clear();

  if (indexCreatedBySuite) {
    try {
      await esClient.indices.delete({ index: PROPOSALS_WRITE_INDEX });
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    indexCreatedBySuite = false;
  }

  if (!templateExistedBeforeSuite) {
    try {
      await esClient.indices.deleteIndexTemplate({ name: PROPOSALS_INDEX_ALIAS });
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    templateExistedBeforeSuite = false;
  }

  // The next suite in this worker has to re-run the readiness dance: the
  // index may be gone now.
  indexReady = undefined;
};

export interface SeedProposalOptions {
  /** Space the document is written for. Defaults to the default Space. */
  spaceId?: string;
  conversationId?: string;
  comment?: string;
  impact?: string;
  confidence?: string;
  origin?: 'worker' | 'analyst';
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

  // There is no create-via-HTTP route on purpose: only the workflow's
  // `proposals.createProposal` step, which knows the execution id to stamp, may
  // make one. With no workflow to drive, this seeds a document shaped exactly
  // like `create()` writes, through the same alias the storage adapter uses.
  const response = await esClient.index({
    index: PROPOSALS_INDEX_ALIAS,
    document: {
      spaceId: options.spaceId ?? 'default',
      conversationId: options.conversationId ?? `scout-conversation-${Date.now()}`,
      comment: options.comment ?? 'Seeded by the revisions Scout suite',
      status: options.status ?? 'pending',
      rootProposalId: undefined,
      revision: 1,
      impact,
      confidence,
      impactRank: IMPACT_RANK[impact],
      confidenceRank: CONFIDENCE_RANK[confidence],
      category: 'tune',
      // Required by `proposalSchema` and always stamped by `create()`, so a seed
      // without it is a shape this plugin never writes in production.
      origin: options.origin ?? 'worker',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      workflowExecutionId: `scout-fake-execution-${Date.now()}`,
      createdAt: now,
    },
    refresh: 'wait_for',
  });
  const id = response._id;
  // Tracked before the follow-up update, not after: the document exists from the
  // index call onwards, so an update that throws must not leave it untracked —
  // cleanup would then never remove it from a shared server.
  trackProposal(id);
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
  id: string,
  spaceId: string = 'default'
): Promise<ApiClientResponse> =>
  apiClient.get(spaceUrl(`${PROPOSALS_PATH}/${id}`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const reviseProposal = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: Record<string, unknown> = {},
  spaceId: string = 'default'
): Promise<ApiClientResponse> =>
  apiClient.post(spaceUrl(`${PROPOSALS_PATH}/${id}/revisions`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

export const dismissProposal = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: Record<string, unknown> = { dismissReason: 'other' },
  spaceId: string = 'default'
): Promise<ApiClientResponse> =>
  apiClient.post(spaceUrl(`${PROPOSALS_PATH}/${id}/dismiss`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });
