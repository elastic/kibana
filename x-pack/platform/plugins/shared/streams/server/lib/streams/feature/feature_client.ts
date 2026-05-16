/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import { esql } from '@elastic/esql';
import type { ComposerSortShorthand } from '@elastic/esql';
import type {
  BulkResponseItem,
  ErrorCause,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { BaseFeature, Feature, FeatureHistoryEntry } from '@kbn/streams-schema';
import { isDuplicateFeature } from '@kbn/streams-schema';
import { isConditionComplete } from '@kbn/streamlang';
import {
  type LatestSourceWhereCondition,
  runLatestSourceEsqlQuery,
} from '../../sig_events/latest_source_query';
import { searchWithKeywordFallback } from '../errors/search_with_keyword_fallback';
import type { SearchMode } from '../../../../common/queries';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';
import { StatusError } from '../errors/status_error';
import { FEATURES_DATA_STREAM, type StoredFeatureDoc } from './data_stream';
import type { StoredFeature } from './stored_feature';
import {
  STREAM_NAME,
  FEATURE_ID,
  FEATURE_TYPE,
  FEATURE_SUBTYPE,
  FEATURE_TITLE,
  FEATURE_DESCRIPTION,
  FEATURE_PROPERTIES,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_EVIDENCE_DOC_IDS,
  FEATURE_TAGS,
  FEATURE_META,
  FEATURE_FILTER,
  FEATURE_RUN_ID,
  FEATURE_SEARCH_EMBEDDING,
  FEATURE_DELETED,
} from './fields';

const SEARCH_SIZE_LIMIT = 10_000;
const INFERENCE_RE = /inference/i;
const MAX_INFERENCE_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 2000;

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

function escapeWildcard(input: string): string {
  return input.replace(/[\\*?]/g, '\\$&');
}

function wildcardQuery<T extends string>(
  field: T,
  value: string | undefined,
  opts: { boost?: number } = {}
): QueryDslQueryContainer[] {
  if (!value) return [];
  return [
    {
      wildcard: {
        [field]: {
          value: `*${escapeWildcard(value)}*`,
          case_insensitive: true,
          ...(opts.boost !== undefined && { boost: opts.boost }),
        },
      },
    },
  ];
}

function tagsQuery(field: string, query: string): QueryDslQueryContainer[] {
  const tokens = query.split(/\s+/).filter((value) => value.length > 3);
  if (tokens.length === 0) return [];
  return tokens.map((token) => ({
    term: { [field]: { value: token, case_insensitive: true } },
  }));
}

function buildKeywordQuery(
  query: string,
  filter: QueryDslQueryContainer[]
): QueryDslQueryContainer {
  return {
    bool: {
      filter,
      should: [
        ...wildcardQuery(FEATURE_TITLE, query, { boost: 3 }),
        ...wildcardQuery(FEATURE_DESCRIPTION, query, { boost: 2 }),
        ...wildcardQuery(FEATURE_TYPE, query),
        ...wildcardQuery(FEATURE_SUBTYPE, query),
        ...tagsQuery(FEATURE_TAGS, query),
      ],
      minimum_should_match: 1,
    },
  };
}

export function buildSearchEmbeddingText(feature: BaseFeature, streamName?: string): string {
  const parts: string[] = [];
  if (streamName) parts.push(`Stream: ${streamName}`);
  if (feature.title) parts.push(`Title: ${feature.title}`);
  if (feature.description) parts.push(`Description: ${feature.description}`);
  if (feature.type) parts.push(`Type: ${feature.type}`);
  if (feature.subtype) parts.push(`Subtype: ${feature.subtype}`);
  if ((feature.tags?.length ?? 0) > 0) parts.push(`Tags: ${feature.tags?.join(', ')}`);
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Inference fallback for raw ES bulk responses
// ---------------------------------------------------------------------------

function errorCauseMentionsInference(cause: ErrorCause): boolean {
  if (cause.type && INFERENCE_RE.test(cause.type)) return true;
  if (cause.reason && INFERENCE_RE.test(cause.reason)) return true;
  if (cause.caused_by && errorCauseMentionsInference(cause.caused_by)) return true;
  if (cause.root_cause?.some(errorCauseMentionsInference)) return true;
  if (cause.suppressed?.some(errorCauseMentionsInference)) return true;
  return false;
}

function countRawBulkInferenceErrors(items: Array<Record<string, BulkResponseItem>>): {
  inference: number;
  other: number;
} {
  let inference = 0;
  let other = 0;
  for (const item of items) {
    const op = Object.keys(item)[0] as keyof typeof item;
    const detail = item[op];
    if (detail?.error) {
      if (errorCauseMentionsInference(detail.error as ErrorCause)) {
        inference++;
      } else {
        other++;
      }
    }
  }
  return { inference, other };
}

async function bulkCreateWithInferenceFallback(
  logger: Logger,
  attempt: (opts: {
    includeEmbedding: boolean;
  }) => Promise<{ errors: boolean; items: Array<Record<string, BulkResponseItem>> }>
): Promise<void> {
  for (let attemptNumber = 1; attemptNumber <= MAX_INFERENCE_ATTEMPTS; attemptNumber++) {
    const response = await attempt({ includeEmbedding: true });
    if (!response.errors) return;

    const { inference, other } = countRawBulkInferenceErrors(response.items);
    if (inference === 0) {
      throw new Error(`Bulk write failed with non-inference errors (${other} items)`);
    }
    if (other > 0) {
      logger.warn(
        `Bulk write failed with mixed errors (${inference} inference + ${other} other) -- not retrying`
      );
      throw new Error(`Bulk write failed with mixed errors`);
    }

    const isLastAttempt = attemptNumber === MAX_INFERENCE_ATTEMPTS;
    if (isLastAttempt) {
      logger.warn(
        `Bulk write failed due to inference error (${inference} items) after ${attemptNumber} attempts -- falling back to writing without semantic_text embedding`
      );
      break;
    }

    const delayMs = Math.pow(2, attemptNumber - 1) * BASE_BACKOFF_MS;
    logger.warn(
      `Bulk write failed due to inference error (${inference} items) -- retrying in ${delayMs}ms (attempt ${attemptNumber}/${MAX_INFERENCE_ATTEMPTS})`
    );
    await setTimeout(delayMs);
  }

  const fallbackResponse = await attempt({ includeEmbedding: false });
  if (!fallbackResponse.errors) {
    logger.debug('Bulk write fallback without embedding succeeded');
    return;
  }
  const { inference, other } = countRawBulkInferenceErrors(fallbackResponse.items);
  throw new Error(`Bulk write fallback failed (${inference} inference + ${other} other errors)`);
}

// ---------------------------------------------------------------------------
// ES|QL helpers
// ---------------------------------------------------------------------------

const andWhere = (
  current: LatestSourceWhereCondition | undefined,
  next: LatestSourceWhereCondition
): LatestSourceWhereCondition => {
  return current ? esql.exp`(${current}) AND (${next})` : next;
};

/**
 * Excludes (feature.id, stream.name) groups whose latest event is a tombstone.
 *
 * MUST be applied AFTER the latest-per-group reduction. Applying it pre-grouping
 * would drop tombstones from the candidate set and let an older non-deleted
 * revision be re-elected as the "current" state of an already-deleted feature.
 */
const NOT_DELETED_POST_GROUPING_WHERE: LatestSourceWhereCondition = esql.exp`${esql.col(
  FEATURE_DELETED
)} IS NULL OR ${esql.col(FEATURE_DELETED)} == false`;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Excludes groups whose latest revision is older than `now - ttlDays`.
 *
 * Equivalent to the pre-refactor `expires_at >= now` filter, but computed at
 * read time against `@timestamp` of the latest surviving revision. Re-emitting
 * a feature refreshes its `@timestamp` and slides it back inside the window;
 * features the LLM stops producing age out without needing a stored `expires_at`.
 *
 * Applied POST-grouping for the same reason as `NOT_DELETED_POST_GROUPING_WHERE`:
 * we want the filter to consider the current state of each group, not to drop
 * old revisions before the latest-per-group reduction picks a winner.
 */
const buildFreshnessPostGroupingWhere = (ttlDays: number): LatestSourceWhereCondition => {
  const cutoff = new Date(Date.now() - ttlDays * MS_PER_DAY).toISOString();
  return esql.exp`@timestamp >= TO_DATETIME(${esql.str(cutoff)})`;
};

/** Returns the ES `_id` of the latest non-deleted revision per (feature.id, stream.name) */
async function runLatestIdsEsqlQuery({
  esClient,
  index,
  where,
  postGroupingWhere = NOT_DELETED_POST_GROUPING_WHERE,
}: {
  esClient: ElasticsearchClient;
  index: string;
  where?: LatestSourceWhereCondition;
  postGroupingWhere?: LatestSourceWhereCondition;
}): Promise<string[]> {
  let query = esql.from([index], ['_id', '_source']);

  if (where) {
    query = query.where`${where}`;
  }

  query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(
    'feature.id'
  )}, ${esql.col('stream.name')}`.where`@timestamp == latest_ts`;
  query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col('feature.id')}, ${esql.col(
    'stream.name'
  )}`.where`_id == tiebreaker_id`;
  query = query.where`${postGroupingWhere}`;
  query = query.keep('_id');

  const response = (await esClient.esql.query({
    query: query.print(),
  })) as ESQLSearchResponse;

  const idIdx = response.columns.findIndex((c) => c.name === '_id');
  if (idIdx === -1) return [];
  return response.values.map((row) => row[idIdx] as string);
}

// ---------------------------------------------------------------------------
// Bulk operation types
// ---------------------------------------------------------------------------

interface FeatureBulkIndexOperation {
  index: { feature: Feature };
}
interface FeatureBulkDeleteOperation {
  delete: { id: string };
}
interface FeatureBulkExcludeOperation {
  exclude: { id: string };
}
interface FeatureBulkRestoreOperation {
  restore: { id: string };
}

export type FeatureBulkOperation =
  | FeatureBulkIndexOperation
  | FeatureBulkDeleteOperation
  | FeatureBulkExcludeOperation
  | FeatureBulkRestoreOperation;

// ---------------------------------------------------------------------------
// FeatureClient
// ---------------------------------------------------------------------------

type FeatureDataStreamClient = IDataStreamClient<MappingsDefinition, StoredFeatureDoc>;

export class FeatureClient {
  constructor(
    private readonly clients: {
      dataStreamClient: FeatureDataStreamClient;
      esClient: ElasticsearchClient;
      logger: Logger;
    },
    private readonly config: Pick<
      SigEventsTuningConfig,
      'feature_ttl_days' | 'semantic_min_score' | 'rrf_rank_constant'
    > = DEFAULT_SIG_EVENTS_TUNING_CONFIG
  ) {}

  // -------------------------------------------------------------------------
  // Writes
  // -------------------------------------------------------------------------

  async bulk(
    stream: string,
    operations: FeatureBulkOperation[]
  ): Promise<{ applied: number; skipped: number }> {
    const indexOps: Feature[] = [];
    const deleteIds: string[] = [];
    let skipped = 0;

    for (const op of operations) {
      if ('index' in op) {
        indexOps.push(op.index.feature);
      } else if ('delete' in op) {
        deleteIds.push(op.delete.id);
      } else if ('exclude' in op) {
        this.clients.logger.debug(
          `Exclusion store not implemented; ignoring exclude op for id=${op.exclude.id}`
        );
        skipped++;
      } else if ('restore' in op) {
        this.clients.logger.debug(
          `Exclusion store not implemented; ignoring restore op for id=${op.restore.id}`
        );
        skipped++;
      }
    }

    validateFeatures(indexOps);

    const now = new Date().toISOString();
    const documents: StoredFeatureDoc[] = [];

    for (const feature of indexOps) {
      documents.push(toStorage(stream, feature));
    }
    for (const uuid of deleteIds) {
      documents.push(toTombstone(stream, uuid, now));
    }

    if (documents.length === 0) {
      return { applied: 0, skipped };
    }

    const { dataStreamClient, logger } = this.clients;
    await bulkCreateWithInferenceFallback(logger, async ({ includeEmbedding }) => {
      const docs = includeEmbedding
        ? documents
        : documents.map((doc) => {
            const { [FEATURE_SEARCH_EMBEDDING]: _, ...rest } = doc;
            return rest as StoredFeatureDoc;
          });
      const response = await dataStreamClient.create({ documents: docs });
      return {
        errors: response.errors,
        items: response.items as Array<Record<string, BulkResponseItem>>,
      };
    });

    return { applied: documents.length, skipped };
  }

  async deleteFeature(stream: string, id: string): Promise<void> {
    await this.getFeature(stream, id);
    await this.bulk(stream, [{ delete: { id } }]);
  }

  async deleteFeatures(stream: string): Promise<void> {
    // Tombstone every latest revision, including expired ones — otherwise an
    // expired feature would silently survive `deleteFeatures` and reappear if
    // a future read passes `includeExpired: true`.
    const { hits } = await this.findLatest({
      where: buildStreamWhere(stream),
      includeExpired: true,
    });
    if (hits.length === 0) return;

    const now = new Date().toISOString();
    const tombstones = hits
      .filter((h) => h[FEATURE_ID])
      .map((h) => toTombstone(stream, h[FEATURE_ID]!, now));
    await this.clients.dataStreamClient.create({ documents: tombstones });
  }

  // -------------------------------------------------------------------------
  // Reads — ES|QL latest-state projections
  // -------------------------------------------------------------------------

  private async findLatest(
    opts: {
      where?: LatestSourceWhereCondition;
      sort?: ComposerSortShorthand[];
      limit?: number;
      /**
       * When `false` (default), groups whose latest revision is older than
       * `feature_ttl_days` are excluded — equivalent to the pre-refactor
       * `expires_at >= now` filter, but computed dynamically against
       * `@timestamp` of the latest revision. Pass `true` for callers that
       * need to see aging features (e.g. recency probes, bulk tombstoning).
       */
      includeExpired?: boolean;
    } = {}
  ): Promise<{ hits: StoredFeature[] }> {
    const { hits } = await runLatestSourceEsqlQuery<StoredFeature>({
      esClient: this.clients.esClient,
      options: {},
      index: FEATURES_DATA_STREAM,
      groupBy: ['feature.id', 'stream.name'],
      where: opts.where,
      postGroupingWhere: opts.includeExpired
        ? NOT_DELETED_POST_GROUPING_WHERE
        : andWhere(
            NOT_DELETED_POST_GROUPING_WHERE,
            buildFreshnessPostGroupingWhere(this.config.feature_ttl_days)
          ),
      sort: opts.sort,
    });

    const limited = opts.limit !== undefined ? hits.slice(0, opts.limit) : hits;
    return { hits: limited };
  }

  async getFeatures(
    streams: string | string[],
    options: {
      type?: string[];
      id?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
      /**
       * Include features whose latest revision is older than `feature_ttl_days`.
       * Defaults to `false` — matches the pre-refactor `includeExpired: false`
       * read default.
       */
      includeExpired?: boolean;
      sort?: ComposerSortShorthand[];
    } = {}
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    let where: LatestSourceWhereCondition | undefined;

    // Stream filter
    const streamLiterals = streamNames.map((s) => esql.str(s));
    where = andWhere(where, esql.exp`${esql.col('stream.name')} IN (${streamLiterals})`);

    // Optional id filter
    if (options.id?.length) {
      const idLiterals = options.id.map((id) => esql.str(id));
      where = andWhere(where, esql.exp`${esql.col('feature.id')} IN (${idLiterals})`);
    }

    // Optional type filter
    if (options.type?.length) {
      const typeLiterals = options.type.map((t) => esql.str(t));
      where = andWhere(where, esql.exp`${esql.col('feature.type')} IN (${typeLiterals})`);
    }

    // Optional confidence filter
    if (typeof options.minConfidence === 'number') {
      where = andWhere(
        where,
        esql.exp`${esql.col('feature.confidence')} >= ${options.minConfidence}`
      );
    }

    const sort: ComposerSortShorthand[] = options.sort ?? [['feature.confidence', 'DESC']];

    const { hits } = await this.findLatest({
      where,
      sort,
      limit: options.limit,
      includeExpired: options.includeExpired,
    });
    const features = hits.map(fromStorage);
    return { hits: features, total: features.length };
  }

  async getFeature(stream: string, id: string): Promise<Feature> {
    const where = andWhere(
      esql.exp`${esql.col('feature.id')} == ${esql.str(id)}`,
      esql.exp`${esql.col('stream.name')} == ${esql.str(stream)}`
    );

    // Direct lookups by id ignore expiry — matches the pre-refactor
    // `storageClient.get({ id })` behavior, which had no expiry concept.
    const { hits } = await this.findLatest({ where, limit: 1, includeExpired: true });
    if (hits.length === 0) {
      throw new StatusError(`Feature ${id} not found`, 404);
    }
    return fromStorage(hits[0]);
  }

  /** Placeholder — exclusions store not yet implemented. */
  async getExcludedFeatures(_stream: string): Promise<{ hits: Feature[]; total: number }> {
    return { hits: [], total: 0 };
  }

  /**
   * Returns the @timestamp of the latest non-deleted revision for the given
   * stream, optionally filtered by feature type. Used by shouldIdentifyFeatures.
   *
   * Bypasses the freshness filter: the caller's job is to decide whether
   * re-identification is due, which requires visibility into stale features too
   * (a stream whose latest revision aged past TTL should still report that
   * timestamp, not appear empty).
   */
  async getLatestRevisionTimestamp(
    stream: string,
    options: { type?: string[] } = {}
  ): Promise<{ '@timestamp': string } | null> {
    let where: LatestSourceWhereCondition = esql.exp`${esql.col('stream.name')} == ${esql.str(
      stream
    )}`;

    if (options.type?.length) {
      const typeLiterals = options.type.map((t) => esql.str(t));
      where = andWhere(where, esql.exp`${esql.col('feature.type')} IN (${typeLiterals})`);
    }

    const { hits } = await this.findLatest({
      where,
      sort: [['@timestamp', 'DESC']],
      limit: 1,
      includeExpired: true,
    });

    if (hits.length === 0) return null;
    const ts = hits[0]['@timestamp'];
    return ts ? { '@timestamp': ts } : null;
  }

  // -------------------------------------------------------------------------
  // Text search (keyword / semantic / hybrid) — two-phase
  // -------------------------------------------------------------------------

  async findFeatures(
    streams: string | string[],
    query: string,
    options?: {
      searchMode?: SearchMode;
      includeExcluded?: boolean;
      /** See `getFeatures` — defaults to `false`. */
      includeExpired?: boolean;
      limit?: number;
    }
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    return searchWithKeywordFallback(
      this.clients.logger,
      { searchMode: options?.searchMode, label: 'Feature', streamNames },
      (mode) => this.executeFindFeatures(mode, streamNames, query, options)
    );
  }

  private async executeFindFeatures(
    mode: SearchMode,
    streamNames: string[],
    query: string,
    options: { limit?: number; includeExpired?: boolean } = {}
  ): Promise<{ hits: Feature[]; total: number }> {
    // Phase 1: get the latest _id per (feature.id, stream.name) for the given
    // streams; tombstoned groups (latest event is a delete) are excluded by
    // runLatestIdsEsqlQuery itself, and expired groups (latest @timestamp older
    // than feature_ttl_days) are excluded unless the caller opts in.
    const streamLiterals = streamNames.map((s) => esql.str(s));
    const phase1Where: LatestSourceWhereCondition = esql.exp`${esql.col(
      'stream.name'
    )} IN (${streamLiterals})`;

    const phase1PostGroupingWhere: LatestSourceWhereCondition = options.includeExpired
      ? NOT_DELETED_POST_GROUPING_WHERE
      : andWhere(
          NOT_DELETED_POST_GROUPING_WHERE,
          buildFreshnessPostGroupingWhere(this.config.feature_ttl_days)
        );

    const latestIds = await runLatestIdsEsqlQuery({
      esClient: this.clients.esClient,
      index: FEATURES_DATA_STREAM,
      where: phase1Where,
      postGroupingWhere: phase1PostGroupingWhere,
    });

    if (latestIds.length === 0) {
      return { hits: [], total: 0 };
    }

    // Phase 2: run retriever search scoped to latest ids
    const idsFilter: QueryDslQueryContainer = { ids: { values: latestIds } };
    const streamFilter: QueryDslQueryContainer = {
      bool: {
        should: streamNames.map((s) => ({ term: { [STREAM_NAME]: s } })),
        minimum_should_match: 1,
      },
    };
    const baseFilter = [idsFilter, streamFilter];

    const size = options.limit ?? SEARCH_SIZE_LIMIT;

    if (mode === 'keyword') {
      return this.findByKeyword(baseFilter, query, size);
    }
    if (mode === 'semantic') {
      return this.findBySemantic(baseFilter, query, size);
    }
    return this.findByHybrid(baseFilter, query, size);
  }

  private async findByKeyword(
    filter: QueryDslQueryContainer[],
    query: string,
    size: number
  ): Promise<{ hits: Feature[]; total: number }> {
    const response = await this.clients.esClient.search({
      index: FEATURES_DATA_STREAM,
      size,
      track_total_hits: true,
      query: buildKeywordQuery(query, filter),
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source as StoredFeature)),
      total,
    };
  }

  private async findBySemantic(
    filter: QueryDslQueryContainer[],
    query: string,
    size: number
  ): Promise<{ hits: Feature[]; total: number }> {
    const response = await this.clients.esClient.search({
      index: FEATURES_DATA_STREAM,
      size,
      track_total_hits: true,
      retriever: {
        linear: {
          retrievers: [
            {
              retriever: {
                standard: {
                  query: { match: { [FEATURE_SEARCH_EMBEDDING]: query } },
                  filter: { bool: { filter } },
                },
              },
              weight: 1,
              normalizer: 'minmax',
            },
          ],
          rank_window_size: size,
          min_score: this.config.semantic_min_score,
        },
      },
    } as Parameters<ElasticsearchClient['search']>[0]);

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source as StoredFeature)),
      total,
    };
  }

  private async findByHybrid(
    filter: QueryDslQueryContainer[],
    query: string,
    size: number
  ): Promise<{ hits: Feature[]; total: number }> {
    const response = await this.clients.esClient.search({
      index: FEATURES_DATA_STREAM,
      size,
      track_total_hits: true,
      retriever: {
        rrf: {
          retrievers: [
            {
              standard: {
                query: buildKeywordQuery(query, []),
              },
            },
            {
              linear: {
                retrievers: [
                  {
                    retriever: {
                      standard: {
                        query: { match: { [FEATURE_SEARCH_EMBEDDING]: query } },
                      },
                    },
                    weight: 1,
                    normalizer: 'minmax',
                  },
                ],
                rank_window_size: size,
                min_score: this.config.semantic_min_score,
              },
            },
          ],
          filter: { bool: { filter } },
          rank_window_size: size,
          rank_constant: this.config.rrf_rank_constant,
        },
      },
    } as Parameters<ElasticsearchClient['search']>[0]);

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;
    return {
      hits: response.hits.hits.map((hit) => fromStorage(hit._source as StoredFeature)),
      total,
    };
  }

  // -------------------------------------------------------------------------
  // History — raw append-only timeline for a single feature
  // -------------------------------------------------------------------------

  async getFeatureHistory(
    stream: string,
    featureId: string,
    opts: { size?: number } = {}
  ): Promise<FeatureHistoryEntry[]> {
    const limit = Math.min(opts.size ?? 1000, SEARCH_SIZE_LIMIT);

    let query = esql.from([FEATURES_DATA_STREAM], ['_source']).where`${esql.col(
      STREAM_NAME
    )} == ${esql.str(stream)}`.where`${esql.col(FEATURE_ID)} == ${esql.str(featureId)}`;
    query = query.sort(['@timestamp', 'DESC']);
    query = query.keep('_source');

    const queryStr = `${query.print()} | LIMIT ${limit}`;

    const response = (await this.clients.esClient.esql.query({
      query: queryStr,
    })) as ESQLSearchResponse;

    const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
    if (sourceIdx === -1) return [];

    // docs is DESC (newest first)
    const docs = response.values.map((row) => {
      const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
      const { kibana: _kibana, ...rest } = source;
      return rest as StoredFeatureDoc;
    });

    // Classify in ascending order (oldest first)
    const ascending = [...docs].reverse();
    const seen = new Set<string>();
    const changeTypes: Array<FeatureHistoryEntry['change_type']> = [];

    for (const doc of ascending) {
      if (doc[FEATURE_DELETED] === true) {
        changeTypes.push('deleted');
      } else {
        const runId = doc[FEATURE_RUN_ID] as string | undefined;
        if (runId === undefined || !seen.has(runId)) {
          changeTypes.push('new');
          if (runId !== undefined) seen.add(runId);
        } else {
          changeTypes.push('updated');
        }
      }
    }

    // Map back to DESC order; docs[i] corresponds to ascending[n-1-i]
    const n = docs.length;
    return docs.map((doc, i) => ({
      '@timestamp': doc['@timestamp'] as string,
      run_id: doc[FEATURE_RUN_ID] as string | undefined,
      change_type: changeTypes[n - 1 - i],
      snapshot: doc as Record<string, unknown>,
    }));
  }

  // -------------------------------------------------------------------------
  // Duplicate detection (unchanged from old client)
  // -------------------------------------------------------------------------

  findDuplicateFeature({
    existingFeatures,
    feature,
  }: {
    existingFeatures: Feature[];
    feature: BaseFeature;
  }): Feature | undefined {
    return existingFeatures.find((existing) => isDuplicateFeature(existing, feature));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStreamWhere(stream: string): LatestSourceWhereCondition {
  return esql.exp`${esql.col('stream.name')} == ${esql.str(stream)}`;
}

function toStorage(stream: string, feature: Feature): StoredFeatureDoc {
  const embeddingText = buildSearchEmbeddingText(feature, stream);
  return {
    '@timestamp': new Date().toISOString(),
    [FEATURE_ID]: feature.id,
    [FEATURE_TYPE]: feature.type,
    [FEATURE_SUBTYPE]: feature.subtype,
    [FEATURE_TITLE]: feature.title,
    [FEATURE_DESCRIPTION]: feature.description,
    [FEATURE_PROPERTIES]: feature.properties,
    [FEATURE_CONFIDENCE]: feature.confidence,
    [FEATURE_EVIDENCE]: feature.evidence,
    [FEATURE_EVIDENCE_DOC_IDS]: feature.evidence_doc_ids,
    [FEATURE_TAGS]: feature.tags,
    [STREAM_NAME]: stream,
    [FEATURE_META]: feature.meta,
    [FEATURE_RUN_ID]: feature.run_id,
    [FEATURE_FILTER]: feature.filter,
    ...(embeddingText ? { [FEATURE_SEARCH_EMBEDDING]: embeddingText } : {}),
  } as StoredFeatureDoc;
}

function toTombstone(stream: string, id: string, timestamp: string): StoredFeatureDoc {
  return {
    '@timestamp': timestamp,
    [FEATURE_ID]: id,
    [STREAM_NAME]: stream,
    [FEATURE_DELETED]: true,
  } as StoredFeatureDoc;
}

function fromStorage(feature: StoredFeature): Feature {
  return {
    id: feature[FEATURE_ID]!,
    stream_name: feature[STREAM_NAME]!,
    type: feature[FEATURE_TYPE]!,
    subtype: feature[FEATURE_SUBTYPE],
    title: feature[FEATURE_TITLE],
    description: feature[FEATURE_DESCRIPTION]!,
    properties: feature[FEATURE_PROPERTIES] ?? {},
    confidence: feature[FEATURE_CONFIDENCE] ?? 0,
    evidence: feature[FEATURE_EVIDENCE],
    evidence_doc_ids: feature[FEATURE_EVIDENCE_DOC_IDS],
    tags: feature[FEATURE_TAGS],
    meta: feature[FEATURE_META],
    run_id: feature[FEATURE_RUN_ID],
    filter: feature[FEATURE_FILTER],
    excluded_at: undefined,
  };
}

function validateFeatures(features: Feature[]) {
  for (const feature of features) {
    if (feature.filter && !isConditionComplete(feature.filter)) {
      throw new StatusError(`Invalid feature ${feature.id}: filter is incomplete`, 400);
    }
  }
}
