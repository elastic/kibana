/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { IDataStreamClient } from '@kbn/data-streams';
import type {
  Feature,
  KnowledgeIndicator,
  QueryLink,
  StreamQuery,
} from '@kbn/streams-schema';
import { QUERY_TYPE_STATS, deriveQueryType, isComputedFeature } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema/src/models/streams';
import { isConditionComplete } from '@kbn/streamlang';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';
import type { SearchMode } from '../../../../common/queries';
import { searchWithKeywordFallback } from '../errors/search_with_keyword_fallback';
import { StatusError } from '../errors/status_error';
import {
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  isStoredFeatureKnowledgeIndicator,
  isStoredQueryKnowledgeIndicator,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
  type StoredQueryKnowledgeIndicator,
  type StoredTombstone,
  type knowledgeIndicatorsMappings,
} from './data_stream';
import {
  andWhere,
  NOT_DELETED_POST_GROUPING_WHERE,
  NOT_EXCLUDED_POST_GROUPING_WHERE,
  EXCLUDED_ONLY_POST_GROUPING_WHERE,
} from './esql_helpers';
import {
  runLatestSourceEsqlQuery,
  type LatestSourceWhereCondition,
} from '../../sig_events/latest_source_query';
import { bulkCreateWithInferenceFallback } from './bulk_with_inference_fallback';
import { computeRuleId } from './helpers/compute_rule_id';
import { installQueries, uninstallQueries } from './rule_orchestration';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY, type KnowledgeIndicatorType } from './fields';

const SEARCH_SIZE_LIMIT = 10_000;

export type RuleUnbackedFilter = 'exclude' | 'include' | 'only';

export type KnowledgeIndicatorDataStreamClient = IDataStreamClient<
  typeof knowledgeIndicatorsMappings,
  StoredKnowledgeIndicator & Record<string, unknown>
>;

// ===== Bulk operations =====

interface KIBulkIndexFeatureOperation {
  index: { feature: Feature };
}
interface KIBulkIndexQueryOperation {
  index: { query: StreamQuery & { rule_backed?: boolean } };
}
interface KIBulkDeleteOperation {
  delete: { type: KnowledgeIndicatorType; id: string };
}
interface KIBulkExcludeOperation {
  exclude: { id: string };
}
interface KIBulkRestoreOperation {
  restore: { id: string };
}
export type KIBulkOperation =
  | KIBulkIndexFeatureOperation
  | KIBulkIndexQueryOperation
  | KIBulkDeleteOperation
  | KIBulkExcludeOperation
  | KIBulkRestoreOperation;

// ===== Storage helpers =====

function buildSearchEmbeddingFeature(feature: Feature, streamName: string): string {
  const parts: string[] = [`Stream: ${streamName}`];
  if (feature.title) parts.push(`Title: ${feature.title}`);
  if (feature.description) parts.push(`Description: ${feature.description}`);
  if (feature.type) parts.push(`Type: ${feature.type}`);
  if (feature.subtype) parts.push(`Subtype: ${feature.subtype}`);
  if ((feature.tags?.length ?? 0) > 0) parts.push(`Tags: ${feature.tags?.join(', ')}`);
  return parts.join('\n');
}

function buildSearchEmbeddingQuery(
  query: Pick<StreamQuery, 'title' | 'description'>,
  streamName: string
): string {
  const parts: string[] = [`Stream: ${streamName}`, `Title: ${query.title}`];
  if (query.description) parts.push(`Description: ${query.description}`);
  return parts.join('\n');
}

function toStoredFeature(
  streamName: string,
  feature: Feature,
  includeEmbedding: boolean,
  overrides: { excluded?: boolean } = {}
): StoredFeatureKnowledgeIndicator {
  const embedding = buildSearchEmbeddingFeature(feature, streamName);
  const excluded = overrides.excluded ?? feature.excluded;
  return {
    '@timestamp': new Date().toISOString(),
    id: feature.id,
    type: KI_TYPE_FEATURE,
    title: feature.title,
    description: feature.description,
    tags: feature.tags,
    evidence: feature.evidence,
    'stream.name': streamName,
    deleted: feature.deleted,
    ...(excluded !== undefined ? { excluded } : {}),
    run_id: feature.run_id,
    feature: {
      type: feature.type,
      subtype: feature.subtype,
      properties: feature.properties,
      confidence: feature.confidence,
      evidence_doc_ids: feature.evidence_doc_ids,
      filter: feature.filter,
      meta: feature.meta,
    },
    ...(includeEmbedding && embedding ? { search_embedding: embedding } : {}),
  };
}

function toStoredQuery(
  streamName: string,
  query: StreamQuery & { rule_backed?: boolean; rule_id?: string },
  includeEmbedding: boolean
): StoredQueryKnowledgeIndicator {
  const embedding = buildSearchEmbeddingQuery(query, streamName);
  const derivedType = deriveQueryType(query.esql.query);
  // STATS queries are never rule-backed.
  const ruleBacked = derivedType === QUERY_TYPE_STATS ? false : Boolean(query.rule_backed);
  const ruleId = query.rule_id ?? computeRuleId(streamName, query.id, query.esql.query);
  return {
    '@timestamp': new Date().toISOString(),
    id: query.id,
    type: KI_TYPE_QUERY,
    title: query.title,
    description: query.description,
    evidence: query.evidence,
    'stream.name': streamName,
    query: {
      esql: query.esql.query,
      query_type: derivedType,
      severity_score: query.severity_score,
      rule_backed: ruleBacked,
      rule_id: ruleId,
      features: query.features,
    },
    ...(includeEmbedding && embedding ? { search_embedding: embedding } : {}),
  };
}

function tombstoneFromLatest(
  streamName: string,
  latest: StoredKnowledgeIndicator
): StoredTombstone {
  return {
    '@timestamp': new Date().toISOString(),
    id: latest.id,
    type: latest.type,
    'stream.name': streamName,
    deleted: true,
  };
}

function tombstoneById(
  streamName: string,
  type: KnowledgeIndicatorType,
  id: string
): StoredTombstone {
  return {
    '@timestamp': new Date().toISOString(),
    id,
    type,
    'stream.name': streamName,
    deleted: true,
  };
}

function fromStoredFeature(doc: StoredFeatureKnowledgeIndicator): Feature {
  return {
    id: doc.id,
    stream_name: doc['stream.name'],
    type: doc.feature.type,
    description: doc.description,
    properties: doc.feature.properties,
    confidence: doc.feature.confidence,
    title: doc.title,
    subtype: doc.feature.subtype,
    evidence: doc.evidence,
    evidence_doc_ids: doc.feature.evidence_doc_ids,
    tags: doc.tags,
    filter: doc.feature.filter,
    meta: doc.feature.meta,
    run_id: doc.run_id,
    deleted: doc.deleted,
    excluded: doc.excluded,
    updated_at: doc['@timestamp'],
  };
}

function fromStoredQuery(doc: StoredQueryKnowledgeIndicator): QueryLink {
  const { query_type: type, rule_backed, rule_id, esql, severity_score, features } = doc.query;
  const ruleBacked = type === QUERY_TYPE_STATS ? false : rule_backed;

  return {
    stream_name: doc['stream.name'],
    rule_backed: ruleBacked,
    rule_id,
    updated_at: doc['@timestamp'],
    query: {
      id: doc.id,
      type,
      title: doc.title,
      description: doc.description,
      esql: { query: esql },
      severity_score,
      features,
      evidence: doc.evidence,
    },
  };
}

function ruleUnbackedPostGroupingWhere(
  filter: RuleUnbackedFilter | undefined
): LatestSourceWhereCondition | undefined {
  switch (filter) {
    case 'include':
      return undefined;
    case 'only':
      return esql.exp`${esql.col('query.rule_backed')} == false`;
    case 'exclude':
    default:
      return esql.exp`${esql.col('query.rule_backed')} == true`;
  }
}

// ===== Client =====

export interface KnowledgeIndicatorClientDeps {
  dataStreamClient: KnowledgeIndicatorDataStreamClient;
  esClient: ElasticsearchClient;
  rulesClient: RulesClient;
  soClient: SavedObjectsClientContract;
  space: string;
  logger: Logger;
}

export class KnowledgeIndicatorClient {
  constructor(
    private readonly deps: KnowledgeIndicatorClientDeps,
    private readonly isSignificantEventsEnabled: boolean = false,
    private readonly config: Pick<
      SigEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant'
    > = DEFAULT_SIG_EVENTS_TUNING_CONFIG
  ) {}

  // ==================== Writes ====================

  async bulk(
    stream: string,
    operations: KIBulkOperation[]
  ): Promise<{ applied: number; skipped: number }> {
    if (operations.length === 0) {
      return { applied: 0, skipped: 0 };
    }

    // Validate any feature filters up front.
    for (const op of operations) {
      if ('index' in op && 'feature' in op.index) {
        const f = op.index.feature;
        if (f.filter && !isConditionComplete(f.filter)) {
          throw new StatusError(`Invalid feature ${f.id}: filter is incomplete`, 400);
        }
      }
    }

    // Exclude requires a pre-read: the new revision must preserve the full
    // feature payload so the Excluded tab can render it and downstream
    // consumers (LLM dedup hint) have the fingerprint.
    const excludeOps = operations.filter((op): op is KIBulkExcludeOperation => 'exclude' in op);
    const excludeIds = new Set(excludeOps.map((op) => op.exclude.id));
    const excludeLatest = excludeIds.size > 0 ? await this.fetchLatestFeatures(stream, [...excludeIds]) : [];
    const excludableLatest: StoredFeatureKnowledgeIndicator[] = [];
    let excludeSkipped = 0;
    for (const id of excludeIds) {
      const latest = excludeLatest.find((doc) => doc.id === id);
      if (!latest) {
        // Unknown id → no-op. Excluding an id that doesn't exist would
        // create an orphan revision; treat as skipped.
        excludeSkipped += 1;
        continue;
      }
      const asFeature = fromStoredFeature(latest);
      if (isComputedFeature(asFeature)) {
        // Computed features are derived; excluding them is meaningless
        // (they would be regenerated on the next run). Skip.
        excludeSkipped += 1;
        continue;
      }
      if (latest.excluded === true) {
        // Already excluded — avoid churn revisions that would add no
        // information and only consume retention.
        excludeSkipped += 1;
        continue;
      }
      excludableLatest.push(latest);
    }

    // Delete and restore both append a tombstone keyed on (type, id) without
    // a pre-read. A tombstone carries identity only, not payload, so reading
    // the latest revision adds no value — and tombstoning a non-existent id
    // is harmless and idempotent.
    const deleteOps = operations.filter((op): op is KIBulkDeleteOperation => 'delete' in op);
    const restoreOps = operations.filter((op): op is KIBulkRestoreOperation => 'restore' in op);

    const indexOpsCount = operations.filter((op) => 'index' in op).length;
    const tombstoneCount = deleteOps.length + restoreOps.length;
    const totalApplied = indexOpsCount + excludableLatest.length + tombstoneCount;

    if (totalApplied === 0) {
      return { applied: 0, skipped: excludeSkipped };
    }

    await bulkCreateWithInferenceFallback(this.deps.logger, ({ includeEmbedding }) => {
      const docs: StoredKnowledgeIndicator[] = [];
      for (const op of operations) {
        if ('index' in op) {
          if ('feature' in op.index) {
            docs.push(toStoredFeature(stream, op.index.feature, includeEmbedding));
          } else {
            docs.push(toStoredQuery(stream, op.index.query, includeEmbedding));
          }
        }
      }
      for (const latest of excludableLatest) {
        const feature = fromStoredFeature(latest);
        docs.push(toStoredFeature(stream, feature, includeEmbedding, { excluded: true }));
      }
      for (const op of deleteOps) {
        docs.push(tombstoneById(stream, op.delete.type, op.delete.id));
      }
      for (const op of restoreOps) {
        // Restore is implemented as a tombstone: the append-only payload
        // of an excluded feature can be stale, so we drop the lineage and
        // let the LLM redrive the feature on the next extraction cycle.
        docs.push(tombstoneById(stream, KI_TYPE_FEATURE, op.restore.id));
      }
      return this.deps.dataStreamClient.create({
        space: this.deps.space,
        refresh: 'wait_for',
        documents: docs as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
      });
    });

    return { applied: totalApplied, skipped: excludeSkipped };
  }

  /**
   * Append a tombstone for every latest-per-group revision in a stream.
   * Used when a stream is deleted.
   */
  async deleteIndicators(stream: string): Promise<void> {
    const latest = await this.fetchLatestRevisions(
      [stream],
      undefined,
      undefined,
      NOT_DELETED_POST_GROUPING_WHERE
    );
    if (latest.length === 0) {
      return;
    }
    const tombstones = latest.map((doc) => tombstoneFromLatest(stream, doc));
    await this.deps.dataStreamClient.create({
      space: this.deps.space,
      refresh: 'wait_for',
      documents: tombstones as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
    });
  }

  // ==================== Feature reads ====================

  async getFeatures(
    streams: string | string[],
    options: {
      type?: string[];
      id?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
    } = {}
  ): Promise<{ hits: Feature[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    let where: LatestSourceWhereCondition = esql.exp`${esql.col('type')} == ${esql.str(
      KI_TYPE_FEATURE
    )}`;
    if (streamNames.length === 1) {
      where = andWhere(where, esql.exp`${esql.col('stream.name')} == ${esql.str(streamNames[0])}`);
    } else {
      const literals = streamNames.map((n) => esql.str(n));
      where = andWhere(where, esql.exp`${esql.col('stream.name')} IN (${literals})`);
    }
    if (options.id?.length) {
      const literals = options.id.map((i) => esql.str(i));
      where = andWhere(where, esql.exp`${esql.col('id')} IN (${literals})`);
    }
    if (typeof options.minConfidence === 'number') {
      where = andWhere(
        where,
        esql.exp`${esql.col('feature.confidence')} >= ${options.minConfidence}`
      );
    }

    // Default: hide both tombstones and excluded revisions. When the caller
    // opts into `includeExcluded`, drop the excluded filter so the merged
    // active+excluded set is returned (still without tombstones).
    const postGroupingWhere = options.includeExcluded
      ? NOT_DELETED_POST_GROUPING_WHERE
      : NOT_EXCLUDED_POST_GROUPING_WHERE;

    const docs = await this.fetchLatestRevisions(
      streamNames,
      where,
      undefined,
      postGroupingWhere
    );
    const features = docs.filter(isStoredFeatureKnowledgeIndicator).map(fromStoredFeature);
    const limited = options.limit ? features.slice(0, options.limit) : features;
    return { hits: limited, total: features.length };
  }

  /**
   * Returns the latest revision of every excluded (and not deleted) feature
   * in the stream. Used by the feature-identification task to feed the LLM
   * a "don't suggest these" hint and to keep excluded revisions alive under
   * DSL retention.
   */
  async getExcludedFeatures(stream: string): Promise<{ hits: Feature[]; total: number }> {
    const where = esql.exp`${esql.col('type')} == ${esql.str(KI_TYPE_FEATURE)}`;
    const docs = await this.fetchLatestRevisions(
      [stream],
      where,
      undefined,
      EXCLUDED_ONLY_POST_GROUPING_WHERE
    );
    const features = docs
      .filter(isStoredFeatureKnowledgeIndicator)
      .map(fromStoredFeature)
      .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
    return { hits: features, total: features.length };
  }

  /**
   * Append a fresh excluded revision per currently-excluded feature so they
   * don't age out under DSL retention. Called once per features-identification
   * task invocation.
   *
   * Bypasses `bulk(...{ exclude })` because that path intentionally skips
   * features whose latest is already excluded (to avoid churn on the user's
   * exclude action) — but the keep-alive case is exactly the opposite: we
   * want to refresh those revisions specifically.
   */
  async refreshExcludedFeatures(stream: string): Promise<{ refreshed: number }> {
    const where = esql.exp`${esql.col('type')} == ${esql.str(KI_TYPE_FEATURE)}`;
    const docs = await this.fetchLatestRevisions(
      [stream],
      where,
      undefined,
      EXCLUDED_ONLY_POST_GROUPING_WHERE
    );
    const latest = docs.filter(isStoredFeatureKnowledgeIndicator);
    if (latest.length === 0) {
      return { refreshed: 0 };
    }
    await bulkCreateWithInferenceFallback(this.deps.logger, ({ includeEmbedding }) => {
      const refreshed = latest.map((doc) =>
        toStoredFeature(stream, fromStoredFeature(doc), includeEmbedding, { excluded: true })
      );
      return this.deps.dataStreamClient.create({
        space: this.deps.space,
        refresh: 'wait_for',
        documents: refreshed as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
      });
    });
    return { refreshed: latest.length };
  }

  async getFeature(stream: string, id: string): Promise<Feature> {
    const { hits } = await this.getFeatures(stream, { id: [id] });
    if (hits.length === 0) {
      throw new StatusError(`Feature ${id} not found`, 404);
    }
    return hits[0];
  }

  /**
   * Pure ES|QL probe: returns the timestamp of the most recent feature
   * revision for a stream (regardless of whether it's a tombstone).
   */
  async getLatestRevisionTimestamp(
    stream: string,
    options: { types?: string[] } = {}
  ): Promise<{ '@timestamp': string } | null> {
    let where: LatestSourceWhereCondition = esql.exp`${esql.col('type')} == ${esql.str(
      KI_TYPE_FEATURE
    )} AND ${esql.col('stream.name')} == ${esql.str(stream)}`;
    if (options.types?.length) {
      const literals = options.types.map((t) => esql.str(t));
      where = andWhere(where, esql.exp`${esql.col('feature.type')} IN (${literals})`);
    }
    const docs = await this.fetchLatestRevisions([stream], where, undefined);
    if (docs.length === 0) return null;
    const latest = docs.reduce((best, current) =>
      current['@timestamp'] > best['@timestamp'] ? current : best
    );
    return { '@timestamp': latest['@timestamp'] };
  }

  // ==================== Query reads ====================

  async getQueryLinks(
    streamNames: string[],
    filters?: {
      ruleUnbacked?: RuleUnbackedFilter;
      queryIds?: string[];
      minSeverityScore?: number;
    }
  ): Promise<QueryLink[]> {
    let where: LatestSourceWhereCondition = esql.exp`${esql.col('type')} == ${esql.str(
      KI_TYPE_QUERY
    )}`;
    if (streamNames.length > 0) {
      const literals = streamNames.map((n) => esql.str(n));
      where = andWhere(where, esql.exp`${esql.col('stream.name')} IN (${literals})`);
    }
    if (filters?.queryIds?.length) {
      const literals = filters.queryIds.map((i) => esql.str(i));
      where = andWhere(where, esql.exp`${esql.col('id')} IN (${literals})`);
    }
    if (typeof filters?.minSeverityScore === 'number') {
      where = andWhere(
        where,
        esql.exp`${esql.col('query.severity_score')} >= ${filters.minSeverityScore}`
      );
    }

    let postGroupingWhere = NOT_DELETED_POST_GROUPING_WHERE;
    const ruleUnbacked = ruleUnbackedPostGroupingWhere(filters?.ruleUnbacked ?? 'exclude');
    if (ruleUnbacked) {
      postGroupingWhere = andWhere(postGroupingWhere, ruleUnbacked);
    }

    const docs = await this.fetchLatestRevisions(streamNames, where, undefined, postGroupingWhere);
    return docs.filter(isStoredQueryKnowledgeIndicator).map(fromStoredQuery);
  }

  async getStreamToQueryLinksMap(streamNames: string[]): Promise<Record<string, QueryLink[]>> {
    const links = await this.getQueryLinks(streamNames, { ruleUnbacked: 'include' });
    const result: Record<string, QueryLink[]> = {};
    for (const name of streamNames) {
      result[name] = [];
    }
    for (const link of links) {
      if (!result[link.stream_name]) {
        result[link.stream_name] = [];
      }
      result[link.stream_name].push(link);
    }
    return result;
  }

  async bulkGetQueriesByIds(stream: string, ids: string[]): Promise<QueryLink[]> {
    if (ids.length === 0) return [];
    return this.getQueryLinks([stream], { queryIds: ids, ruleUnbacked: 'include' });
  }

  /**
   * Returns all unbacked, non-STATS queries across streams. Filtering by
   * `query.query_type != stats` happens via the post-grouping WHERE so the
   * latest revision drives the decision.
   */
  async getPromotableUnbackedQueries(filters?: {
    minSeverityScore?: number;
  }): Promise<QueryLink[]> {
    let where: LatestSourceWhereCondition = esql.exp`${esql.col('type')} == ${esql.str(
      KI_TYPE_QUERY
    )}`;
    if (typeof filters?.minSeverityScore === 'number') {
      where = andWhere(
        where,
        esql.exp`${esql.col('query.severity_score')} >= ${filters.minSeverityScore}`
      );
    }

    const postGroupingWhere = andWhere(
      andWhere(
        NOT_DELETED_POST_GROUPING_WHERE,
        esql.exp`${esql.col('query.rule_backed')} == false`
      ),
      esql.exp`${esql.col('query.query_type')} != ${esql.str(QUERY_TYPE_STATS)}`
    );

    const docs = await this.fetchLatestRevisions([], where, undefined, postGroupingWhere);
    return docs.filter(isStoredQueryKnowledgeIndicator).map(fromStoredQuery);
  }

  // ==================== Search ====================

  async findIndicators(
    streams: string | string[],
    query: string,
    options: {
      types?: KnowledgeIndicatorType[];
      searchMode?: SearchMode;
      limit?: number;
      includeExcluded?: boolean;
    } = {}
  ): Promise<{ hits: KnowledgeIndicator[]; total: number }> {
    const streamNames = Array.isArray(streams) ? streams : [streams];
    if (streamNames.length === 0) {
      return { hits: [], total: 0 };
    }

    return searchWithKeywordFallback(
      this.deps.logger,
      { searchMode: options.searchMode, label: 'KnowledgeIndicator', streamNames },
      (mode) => this.executeFindIndicators(mode, streamNames, query, options)
    );
  }

  async findFeatures(
    streams: string | string[],
    query: string,
    options: { searchMode?: SearchMode; limit?: number; includeExcluded?: boolean } = {}
  ): Promise<{ hits: Feature[]; total: number }> {
    const { hits, total } = await this.findIndicators(streams, query, {
      ...options,
      types: [KI_TYPE_FEATURE],
    });
    return {
      hits: hits.flatMap((h) => (h.type === 'feature' ? [h.feature] : [])),
      total,
    };
  }

  async findQueries(
    streams: string | string[],
    query: string,
    filters?: { ruleUnbacked?: RuleUnbackedFilter },
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    const { hits } = await this.findIndicators(streams, query, {
      types: [KI_TYPE_QUERY],
      searchMode,
    });
    const queryLinks = hits.flatMap((h) => (h.type === 'query' ? [h.query] : []));
    if (!filters?.ruleUnbacked || filters.ruleUnbacked === 'include') {
      return queryLinks;
    }
    if (filters.ruleUnbacked === 'only') {
      return queryLinks.filter((q) => !q.rule_backed);
    }
    return queryLinks.filter((q) => q.rule_backed);
  }

  private async executeFindIndicators(
    mode: SearchMode,
    streamNames: string[],
    queryText: string,
    options: { types?: KnowledgeIndicatorType[]; limit?: number; includeExcluded?: boolean }
  ): Promise<{ hits: KnowledgeIndicator[]; total: number }> {
    // Phase 1: ES|QL latest-per-group reduction.
    let typeFilter: LatestSourceWhereCondition | undefined;
    if (options.types?.length === 1) {
      typeFilter = esql.exp`${esql.col('type')} == ${esql.str(options.types[0])}`;
    } else if (options.types?.length === 2) {
      const literals = options.types.map((t) => esql.str(t));
      typeFilter = esql.exp`${esql.col('type')} IN (${literals})`;
    }
    // Default: drop tombstones and excluded revisions. Queries don't write
    // `excluded`, so the filter is a no-op for them. `includeExcluded`
    // relaxes back to drop-tombstones-only.
    const postGroupingWhere = options.includeExcluded
      ? NOT_DELETED_POST_GROUPING_WHERE
      : NOT_EXCLUDED_POST_GROUPING_WHERE;
    const docs = await this.fetchLatestRevisions(
      streamNames,
      typeFilter,
      undefined,
      postGroupingWhere
    );
    const docById = new Map(docs.map((d) => [`${d['stream.name']}:${d.type}:${d.id}`, d]));

    // Phase 2: rank via ES standard search on the latest doc subset. We
    // re-issue a search constrained by the (stream.name, type, id) tuples
    // we got back from phase 1. The data stream client doesn't expose the
    // raw ES client `_id` filter directly, so we scope by id terms.
    if (docById.size === 0) {
      return { hits: [], total: 0 };
    }

    const ids = Array.from(new Set(docs.map((d) => d.id)));
    const limit = options.limit ?? SEARCH_SIZE_LIMIT;

    const filter: Array<Record<string, unknown>> = [
      { terms: { id: ids } },
      { terms: { 'stream.name': streamNames } },
    ];
    if (options.types?.length) {
      filter.push({ terms: { type: options.types } });
    }

    let retriever: Record<string, unknown>;
    if (mode === 'keyword') {
      retriever = {
        standard: {
          query: this.buildKeywordQuery(queryText, filter),
        },
      };
    } else if (mode === 'semantic') {
      retriever = {
        linear: {
          retrievers: [
            {
              retriever: {
                standard: {
                  query: { match: { search_embedding: queryText } },
                  filter: { bool: { filter } },
                },
              },
              weight: 1,
              normalizer: 'minmax',
            },
          ],
          rank_window_size: limit,
          min_score: this.config.semantic_min_score,
        },
      };
    } else {
      retriever = {
        rrf: {
          retrievers: [
            { standard: { query: this.buildKeywordQuery(queryText, []) } },
            {
              linear: {
                retrievers: [
                  {
                    retriever: {
                      standard: { query: { match: { search_embedding: queryText } } },
                    },
                    weight: 1,
                    normalizer: 'minmax',
                  },
                ],
                rank_window_size: limit,
                min_score: this.config.semantic_min_score,
              },
            },
          ],
          filter: { bool: { filter } },
          rank_window_size: limit,
          rank_constant: this.config.rrf_rank_constant,
        },
      };
    }

    const response = await this.deps.dataStreamClient.search({
      space: this.deps.space,
      size: limit,
      track_total_hits: true,
      retriever: retriever as never,
    });

    const hits: KnowledgeIndicator[] = [];
    for (const hit of response.hits.hits) {
      const source = hit._source as StoredKnowledgeIndicator | undefined;
      if (!source) continue;
      // Only surface the latest revision for each group — drop ranked rows
      // whose latest revision is missing or does not match this hit.
      const latest = docById.get(`${source['stream.name']}:${source.type}:${source.id}`);
      if (!latest || latest['@timestamp'] !== source['@timestamp']) {
        continue;
      }
      if (isStoredFeatureKnowledgeIndicator(source)) {
        hits.push({ type: 'feature', feature: fromStoredFeature(source) });
      } else if (isStoredQueryKnowledgeIndicator(source)) {
        hits.push({ type: 'query', query: fromStoredQuery(source) });
      }
    }

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? hits.length;

    return { hits, total };
  }

  private buildKeywordQuery(
    queryText: string,
    filter: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    const escaped = queryText.replace(/[\\*?]/g, '\\$&');
    const wildcard = (field: string, boost?: number) => ({
      wildcard: {
        [field]: {
          value: `*${escaped}*`,
          case_insensitive: true,
          ...(boost !== undefined ? { boost } : {}),
        },
      },
    });
    return {
      bool: {
        filter,
        should: [wildcard('title', 3), wildcard('description', 2), wildcard('feature.subtype')],
        minimum_should_match: 1,
      },
    };
  }

  // ==================== Rule lifecycle ====================

  async syncQueries(definition: Streams.all.Definition, queries: StreamQuery[]): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping syncQueries for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentLinks } = await this.getStreamToQueryLinksMap([stream]);
    const currentByQueryId = new Map(currentLinks.map((link) => [link.query.id, link]));
    const nextIds = new Set(queries.map((q) => q.id));

    const toCreate: QueryLink[] = [];
    const toUpdate: QueryLink[] = [];
    const demotedToStats: QueryLink[] = [];
    const allNext: Array<{ query: StreamQuery; rule_backed: boolean; rule_id: string }> = [];

    for (const query of queries) {
      const current = currentByQueryId.get(query.id);
      const isStats = deriveQueryType(query.esql.query) === QUERY_TYPE_STATS;
      const ruleId = computeRuleId(stream, query.id, query.esql.query);
      if (!current) {
        const ruleBacked = !isStats;
        const link: QueryLink = {
          stream_name: stream,
          rule_backed: ruleBacked,
          rule_id: ruleId,
          query: { ...query, type: deriveQueryType(query.esql.query) },
        };
        if (ruleBacked) toCreate.push(link);
        allNext.push({ query: link.query, rule_backed: ruleBacked, rule_id: ruleId });
      } else if (!current.rule_backed || isStats) {
        if (current.rule_backed && isStats) {
          demotedToStats.push(current);
        }
        allNext.push({ query, rule_backed: false, rule_id: current.rule_id });
      } else if (current.query.esql.query !== query.esql.query) {
        const link: QueryLink = {
          stream_name: stream,
          rule_backed: true,
          rule_id: ruleId,
          query: { ...query, type: deriveQueryType(query.esql.query) },
        };
        toCreate.push(link); // breaking change → recreate
        allNext.push({ query: link.query, rule_backed: true, rule_id: ruleId });
      } else {
        const link: QueryLink = { ...current, query };
        toUpdate.push(link);
        allNext.push({ query, rule_backed: true, rule_id: current.rule_id });
      }
    }

    const toUninstall = currentLinks.filter(
      (link) =>
        (link.rule_backed && !nextIds.has(link.query.id)) ||
        toCreate.some((c) => c.query.id === link.query.id && link.rule_backed) ||
        demotedToStats.some((d) => d.query.id === link.query.id)
    );

    await uninstallQueries(this.deps.rulesClient, this.deps.logger, toUninstall);

    try {
      await installQueries(this.deps.rulesClient, toCreate, toUpdate, definition);
    } catch (installError) {
      this.deps.logger.error(
        `installQueries failed during syncQueries for stream "${stream}". Compensating by uninstalling created rules.`
      );
      await uninstallQueries(this.deps.rulesClient, this.deps.logger, toCreate).catch(
        (compensateError) => {
          this.deps.logger.error(
            `Failed to compensate after installQueries failure for stream "${stream}": ${
              compensateError instanceof Error ? compensateError.message : String(compensateError)
            }`
          );
        }
      );
      throw installError;
    }

    // Append revisions for every next query and a tombstone for every
    // current link that's no longer in the input set.
    const operations: KIBulkOperation[] = [];
    for (const next of allNext) {
      operations.push({
        index: {
          query: {
            ...next.query,
            rule_backed: next.rule_backed,
            rule_id: next.rule_id,
          } as StreamQuery & { rule_backed?: boolean; rule_id?: string },
        },
      });
    }
    for (const link of currentLinks) {
      if (!nextIds.has(link.query.id)) {
        operations.push({ delete: { type: KI_TYPE_QUERY, id: link.query.id } });
      }
    }

    try {
      await this.bulk(stream, operations);
    } catch (storageError) {
      this.deps.logger.error(
        `Storage append failed after rule install for stream "${stream}". Compensating by uninstalling new rules.`
      );
      await uninstallQueries(this.deps.rulesClient, this.deps.logger, toCreate).catch(
        (compensateError) => {
          this.deps.logger.error(
            `Failed to compensate after bulk failure for stream "${stream}": ${
              compensateError instanceof Error ? compensateError.message : String(compensateError)
            }`
          );
        }
      );
      throw storageError;
    }
  }

  async upsertQuery(definition: Streams.all.Definition, query: StreamQuery): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping upsertQuery for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentLinks } = await this.getStreamToQueryLinksMap([stream]);
    const currentByQueryId = new Map(currentLinks.map((link) => [link.query.id, link]));
    const existing = currentByQueryId.get(query.id);

    if (!existing) {
      // First write: include in syncQueries so the rule is created when eligible.
      await this.syncQueries(definition, [...currentLinks.map((l) => l.query), query]);
      return;
    }
    // Update path: route through syncQueries so breaking-change handling is
    // unified.
    await this.syncQueries(
      definition,
      currentLinks.map((l) => (l.query.id === query.id ? query : l.query))
    );
  }

  async deleteQuery(definition: Streams.all.Definition, queryId: string): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping deleteQuery for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentLinks } = await this.getStreamToQueryLinksMap([stream]);
    const target = currentLinks.find((link) => link.query.id === queryId);
    if (!target) {
      return;
    }

    if (target.rule_backed) {
      await uninstallQueries(this.deps.rulesClient, this.deps.logger, [target]);
    }
    await this.bulk(stream, [{ delete: { type: KI_TYPE_QUERY, id: queryId } }]);
  }

  async deleteAllQueries(definition: Streams.all.Definition): Promise<void> {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping deleteAllQueries for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentLinks } = await this.getStreamToQueryLinksMap([stream]);
    const ruleBacked = currentLinks.filter((link) => link.rule_backed);
    if (ruleBacked.length > 0) {
      await uninstallQueries(this.deps.rulesClient, this.deps.logger, ruleBacked);
    }
    if (currentLinks.length === 0) {
      return;
    }
    await this.bulk(
      stream,
      currentLinks.map((link) => ({
        delete: { type: KI_TYPE_QUERY, id: link.query.id },
      }))
    );
  }

  async promoteQueries(
    definition: Streams.all.Definition,
    queryIds: string[]
  ): Promise<{ promoted: number; skipped_stats: number }> {
    const streamName = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping promoteQueries because significant events feature is disabled.`
      );
      return { promoted: 0, skipped_stats: 0 };
    }

    const { [streamName]: links } = await this.getStreamToQueryLinksMap([streamName]);
    const idSet = new Set(queryIds);
    const candidates = links.filter((link) => idSet.has(link.query.id) && !link.rule_backed);

    const skippedStats = candidates.filter((link) => link.query.type === QUERY_TYPE_STATS);
    if (skippedStats.length > 0) {
      this.deps.logger.info(
        `Skipping ${skippedStats.length} STATS queries from promotion for stream "${streamName}" (not yet supported as rules).`
      );
    }

    const toPromote = candidates
      .filter((link) => link.query.type !== QUERY_TYPE_STATS)
      .map((link) => ({
        ...link,
        rule_backed: true,
        rule_id: computeRuleId(streamName, link.query.id, link.query.esql.query),
      }));

    if (toPromote.length === 0) {
      return { promoted: 0, skipped_stats: skippedStats.length };
    }

    await installQueries(this.deps.rulesClient, toPromote, [], definition);

    try {
      await this.bulk(
        streamName,
        toPromote.map((link) => ({
          index: {
            query: {
              ...link.query,
              rule_backed: true,
              rule_id: link.rule_id,
            } as StreamQuery & { rule_backed?: boolean; rule_id?: string },
          },
        }))
      );
    } catch (storageError) {
      this.deps.logger.error(
        `Storage append failed after installing rules for stream "${streamName}". Compensating by uninstalling.`
      );
      await uninstallQueries(this.deps.rulesClient, this.deps.logger, toPromote).catch(
        (uninstallError) => {
          this.deps.logger.error(
            `Failed to compensate — orphaned rules may remain for stream "${streamName}": ${
              uninstallError instanceof Error ? uninstallError.message : String(uninstallError)
            }`
          );
        }
      );
      throw storageError;
    }

    return { promoted: toPromote.length, skipped_stats: skippedStats.length };
  }

  async promoteUnbackedQueries({
    queryIds,
    minSeverityScore,
    streamDefinitions,
  }: {
    queryIds?: string[];
    minSeverityScore?: number;
    streamDefinitions: Map<string, Streams.all.Definition>;
  }): Promise<{ promoted: number; skipped_stats: number }> {
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping promoteUnbackedQueries because significant events feature is disabled.`
      );
      return { promoted: 0, skipped_stats: 0 };
    }

    const candidates = await this.getPromotableUnbackedQueries({ minSeverityScore });

    let toPromote = candidates;
    if (queryIds && queryIds.length > 0) {
      const requestedIds = new Set(queryIds);
      toPromote = candidates.filter((link) => requestedIds.has(link.query.id));
    }

    const byStream = new Map<string, string[]>();
    for (const link of toPromote) {
      const group = byStream.get(link.stream_name) ?? [];
      group.push(link.query.id);
      byStream.set(link.stream_name, group);
    }

    let promoted = 0;
    let skippedStats = 0;
    for (const [streamName, ids] of byStream) {
      const definition = streamDefinitions.get(streamName);
      if (!definition) {
        this.deps.logger.warn(`Skipping promotion for missing stream ${streamName}`);
        continue;
      }
      const result = await this.promoteQueries(definition, ids);
      promoted += result.promoted;
      skippedStats += result.skipped_stats;
    }

    return { promoted, skipped_stats: skippedStats };
  }

  async demoteQueries(
    definition: Streams.all.Definition,
    queryIds: string[]
  ): Promise<{ demoted: number }> {
    const streamName = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.deps.logger.debug(
        `Skipping demoteQueries because significant events feature is disabled.`
      );
      return { demoted: 0 };
    }

    const { [streamName]: links } = await this.getStreamToQueryLinksMap([streamName]);
    const idSet = new Set(queryIds);
    const toDemote = links.filter((link) => link.rule_backed && idSet.has(link.query.id));

    if (toDemote.length === 0) {
      return { demoted: 0 };
    }

    // Append demoted revisions, then uninstall rules. Order matches the
    // legacy semantics: storage first, then rule cleanup.
    await this.bulk(
      streamName,
      toDemote.map((link) => ({
        index: {
          query: {
            ...link.query,
            rule_backed: false,
            rule_id: link.rule_id,
          } as StreamQuery & { rule_backed?: boolean; rule_id?: string },
        },
      }))
    );

    await uninstallQueries(this.deps.rulesClient, this.deps.logger, toDemote);

    return { demoted: toDemote.length };
  }

  // ==================== Internals ====================

  private async fetchLatestRevisions(
    streamNames: string[],
    where: LatestSourceWhereCondition | undefined,
    extraStreamScope: LatestSourceWhereCondition | undefined,
    postGroupingWhere?: LatestSourceWhereCondition
  ): Promise<StoredKnowledgeIndicator[]> {
    let mergedWhere = where;
    if (streamNames.length === 1 && !extraStreamScope) {
      mergedWhere = andWhere(
        mergedWhere ?? esql.exp`true`,
        esql.exp`${esql.col('stream.name')} == ${esql.str(streamNames[0])}`
      );
    } else if (streamNames.length > 1 && !extraStreamScope) {
      const literals = streamNames.map((n) => esql.str(n));
      mergedWhere = andWhere(
        mergedWhere ?? esql.exp`true`,
        esql.exp`${esql.col('stream.name')} IN (${literals})`
      );
    }

    const { hits } = await runLatestSourceEsqlQuery<StoredKnowledgeIndicator>({
      esClient: this.deps.esClient,
      space: this.deps.space,
      options: {},
      index: KNOWLEDGE_INDICATORS_DATA_STREAM,
      where: mergedWhere,
      postGroupingWhere,
      groupBy: ['stream.name', 'type', 'id'],
    });
    return hits;
  }

  /**
   * Fetch the latest non-tombstoned feature revision for each `id` in the
   * given stream. Used by the exclude path which must preserve the full
   * payload on the new revision.
   */
  private async fetchLatestFeatures(
    stream: string,
    ids: string[]
  ): Promise<StoredFeatureKnowledgeIndicator[]> {
    if (ids.length === 0) return [];
    const literals = ids.map((i) => esql.str(i));
    const where = esql.exp`${esql.col('type')} == ${esql.str(KI_TYPE_FEATURE)} AND ${esql.col(
      'stream.name'
    )} == ${esql.str(stream)} AND ${esql.col('id')} IN (${literals})`;
    const docs = await this.fetchLatestRevisions(
      [stream],
      where,
      undefined,
      NOT_DELETED_POST_GROUPING_WHERE
    );
    return docs.filter(isStoredFeatureKnowledgeIndicator);
  }
}
