/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import type { Client } from '@elastic/elasticsearch';
import { DEFAULT_PROPOSAL_TITLE, type ProposalOrigin } from '@kbn/proposals-common';
import { v4 as uuidv4 } from 'uuid';
import { COMMON_HEADERS } from './constants';

const PROPOSALS_PATH = 'internal/proposals';
const PROPOSALS_INDEX_ALIAS = '.kibana-proposals';
const PROPOSALS_WRITE_INDEX = `${PROPOSALS_INDEX_ALIAS}-000001`;

const IMPACT_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const CONFIDENCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Stamped on every seeded `conversationId`, which revisions and clones inherit
 * unchanged, so teardown can delete this run's chains by query.
 *
 * An id-keyed cleanup cannot: `revise()` indexes the child before marking the
 * predecessor, deliberately, so a failed second write leaves a child the route
 * never named in its response and nothing could have recorded.
 */
const SUITE_NAMESPACE = `scout-proposals-${uuidv4()}`;

/** The client reports a status at either level depending on how it threw. */
interface EsError {
  message?: string;
  statusCode?: number;
  body?: { error?: { type?: string; reason?: string } };
  meta?: { statusCode?: number; body?: { error?: { type?: string; reason?: string } } };
}

const statusOf = (error: EsError | undefined): number | undefined =>
  error?.statusCode ?? error?.meta?.statusCode;

/**
 * The concurrent-create race, whichever API reported it, and nothing else.
 *
 * `indices.create` raises `resource_already_exists_exception`, but the
 * index-template API raises a plain `illegal_argument_exception` and only says
 * "already exists" in the reason — so matching on the type alone would rethrow
 * a benign race, while matching on the 400 alone would swallow an invalid
 * mapping in the mirror below and leave the index without its alias.
 */
const isAlreadyExists = (error: EsError | undefined): boolean => {
  if (statusOf(error) !== 400) {
    return false;
  }
  const { type, reason } = error?.body?.error ?? error?.meta?.body?.error ?? {};
  return /already[ _]exists/i.test(`${type ?? ''} ${reason ?? ''} ${error?.message ?? ''}`);
};

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
 * Only ever installed when there is none. Scout config servers are shared
 * between suites and workers, so overwriting an existing template would replace
 * the adapter's own — which carries the `_meta.version` the adapter compares
 * against and settings this mirror does not reproduce — for everything that
 * runs afterwards, with nothing to repair it if no service call gets that far.
 */
let indexReady: Promise<void> | undefined;

const ensureProposalsIndex = (esClient: Client): Promise<void> => {
  if (!indexReady) {
    // Unguarded on purpose: an exists API answers a missing template with
    // `false` rather than an error, so anything thrown here is a real failure.
    // Reading one as "it exists" would skip the install and leave the index
    // below without its alias, which seeding then collides with.
    indexReady = esClient.indices
      .existsIndexTemplate({ name: PROPOSALS_INDEX_ALIAS })
      .then((exists) => {
        if (exists) {
          return undefined;
        }
        return esClient.indices
          .putIndexTemplate({
            name: PROPOSALS_INDEX_ALIAS,
            create: true,
            allow_auto_create: false,
            index_patterns: [`${PROPOSALS_INDEX_ALIAS}-*`],
            template: {
              mappings: {
                dynamic: 'strict',
                properties: {
                  spaceId: { type: 'keyword' },
                  conversationId: { type: 'keyword' },
                  title: { type: 'text' },
                  comment: { type: 'text' },
                  actionWorkflowId: { type: 'keyword' },
                  actionInput: { type: 'flattened' },
                  status: { type: 'keyword' },
                  decision: { type: 'keyword' },
                  decisionPending: { type: 'boolean' },
                  supersededBy: { type: 'keyword' },
                  rootProposalId: { type: 'keyword' },
                  supersedes: { type: 'keyword' },
                  revision: { type: 'long' },
                  impact: { type: 'keyword' },
                  confidence: { type: 'keyword' },
                  category: { type: 'keyword' },
                  origin: { type: 'keyword' },
                  expiresAt: { type: 'date', format: 'strict_date_optional_time' },
                  ranks: {
                    type: 'object',
                    properties: {
                      impact: { type: 'byte' },
                      confidence: { type: 'byte' },
                    },
                  },
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
                  previousExecutionError: { type: 'text' },
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
          .catch((error: EsError) => {
            // Another worker won the race and installed it first, which is the
            // same outcome as finding one already there.
            if (isAlreadyExists(error)) {
              return;
            }
            throw error;
          });
      })
      .then(() =>
        esClient.indices.create({ index: PROPOSALS_WRITE_INDEX }).catch((error: EsError) => {
          // Only the concurrent-create race is benign; any other 400 means the
          // write target is not the alias this seed assumes.
          if (isAlreadyExists(error)) {
            return;
          }
          throw error;
        })
      )
      .then(() => undefined);
  }
  return indexReady;
};

const isNotFound = (error: unknown): boolean => statusOf(error as EsError) === 404;

/**
 * Removes everything this suite put into the stack, so a rerun starts from the
 * same state as the first run. Called from the specs' `afterAll`.
 *
 * Deliberately leaves the write index and the index template in place. Both
 * are the application's own, not suite-namespaced fixtures, and on a shared
 * server winning the race to create one does not make this suite its owner:
 * deleting the index would take every proposal another spec or worker wrote
 * with it, and the template may since have been replaced by the adapter's own
 * versioned copy, which nothing here would reinstall.
 */
export const cleanupProposalFixtures = async (esClient: Client): Promise<void> => {
  try {
    await esClient.deleteByQuery({
      index: PROPOSALS_INDEX_ALIAS,
      refresh: true,
      // Both this suite's seeds and every revision the routes minted from them,
      // including one whose chain link failed and which no response ever named.
      query: { prefix: { conversationId: SUITE_NAMESPACE } },
      conflicts: 'proceed',
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  // The next suite in this worker re-runs the readiness check rather than
  // trusting this one's: another worker may have moved underneath it.
  indexReady = undefined;
};

export interface SeedProposalOptions {
  /** Space the document is written for. Defaults to the default Space. */
  spaceId?: string;
  conversationId?: string;
  title?: string;
  comment?: string;
  impact?: string;
  confidence?: string;
  origin?: ProposalOrigin;
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
      // Namespaced whatever the caller asked for, so teardown can find the whole
      // chain by query while distinct inputs stay distinct.
      conversationId: `${SUITE_NAMESPACE}-${options.conversationId ?? 'conversation'}`,
      // Required by `proposalSchema` and always resolved by `create()`, so a
      // seed without one is a shape this plugin never writes.
      title: options.title ?? DEFAULT_PROPOSAL_TITLE,
      comment: options.comment ?? 'Seeded by the revisions Scout suite',
      status: options.status ?? 'pending',
      rootProposalId: undefined,
      revision: 1,
      impact,
      confidence,
      ranks: { impact: IMPACT_RANK[impact], confidence: CONFIDENCE_RANK[confidence] },
      category: 'tune',
      // Required by `proposalSchema` and always stamped by `create()`, so a seed
      // without it is a shape this plugin never writes in production.
      origin: options.origin ?? 'alertzero',
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
