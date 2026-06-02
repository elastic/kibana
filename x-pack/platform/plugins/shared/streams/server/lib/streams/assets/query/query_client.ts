/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { esql, type ComposerQuery, type ComposerQueryTagHole } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  IStorageClient,
  StorageClientSearchRequest,
  StorageClientSearchResponse,
} from '@kbn/storage-adapter';
import type { QueryFeature } from '@kbn/streams-schema';
import { deriveQueryType, hasSameEsql } from '@kbn/streams-schema/src/helpers/esql_helpers';
import type { Streams } from '@kbn/streams-schema/src/models/streams';
import {
  type QueryType,
  type StreamQuery,
  QUERY_TYPE_STATS,
} from '@kbn/streams-schema/src/queries';
import objectHash from 'object-hash';
import pLimit from 'p-limit';
import {
  type Query,
  type QueryLink,
  type QueryLinkRequest,
  type QueryUnlinkRequest,
  type SearchMode,
} from '../../../../../common/queries';

import { AssetNotFoundError } from '../../errors/asset_not_found_error';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_EVIDENCE,
  QUERY_FEATURES,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  QUERY_KQL_BODY,
  QUERY_SEARCH_EMBEDDING,
  QUERY_SEVERITY_SCORE,
  QUERY_TITLE,
  QUERY_TYPE,
  RULE_BACKED,
  RULE_ID,
  STREAM_NAME,
} from '../fields';
import type { QueryStorageSettings } from '../storage_settings';
import { bulkWithInferenceFallback } from '../../errors/bulk_with_inference_fallback';
import { searchWithKeywordFallback } from '../../errors/search_with_keyword_fallback';
import { normalizeColumn, getSourceColumnIndex, mapSourceRows } from '../../helpers/esql';
import { computeRuleId } from './helpers/query';
import {
  STREAMS_RULE_CONSUMER,
  STREAMS_ESQL_RULE_TYPE_ID,
  type IRulesManagementClient,
} from './rules_management_client';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../../common/sig_events_tuning_config';

type TermQueryFieldValue = string | boolean | number | null;

export type RuleUnbackedFilter = 'exclude' | 'include' | 'only';

const SEARCH_SIZE_LIMIT = 10_000;

const LEGACY_RUNTIME_MAPPINGS = {
  [QUERY_FEATURE_NAME]: { type: 'keyword' as const },
  [QUERY_FEATURE_FILTER]: { type: 'keyword' as const },
};

export interface QueryLinkFilters {
  ruleUnbacked?: RuleUnbackedFilter;
  queryIds?: string[];
  minSeverityScore?: number;
}

interface TermQueryOpts {
  queryEmptyString: boolean;
}

function termQuery<T extends string>(
  field: T,
  value: TermQueryFieldValue | undefined,
  opts: TermQueryOpts = { queryEmptyString: true }
): QueryDslQueryContainer[] {
  if (value === null || value === undefined || (!opts.queryEmptyString && value === '')) {
    return [];
  }

  return [{ term: { [field]: value } }];
}

function ruleUnbackedFilter(value: RuleUnbackedFilter = 'exclude'): QueryDslQueryContainer[] {
  switch (value) {
    case 'include':
      return [];
    case 'only':
      return termQuery(RULE_BACKED, false);
    case 'exclude':
      // Also include legacy docs that predate the rule_backed field.
      return [
        {
          bool: {
            should: [
              { term: { [RULE_BACKED]: true } },
              { bool: { must_not: [{ exists: { field: RULE_BACKED } }] } },
            ],
            minimum_should_match: 1,
          },
        },
      ];
  }
}

type WhereCondition = ESQLAstExpression & ComposerQueryTagHole;

// ES|QL counterpart of `ruleUnbackedFilter`. The DSL helper is still used by
// the semantic/hybrid paths which remain on the search API.
function ruleUnbackedWhere(value: RuleUnbackedFilter = 'exclude'): WhereCondition | null {
  const ruleBackedCol = normalizeColumn(RULE_BACKED);
  switch (value) {
    case 'include':
      return null;
    case 'only':
      return esql.exp`${ruleBackedCol} == false`;
    case 'exclude':
      // COALESCE avoids an `OR` that would break precedence when composed
      // via `andWhere` (the Composer strips syntactic parens).
      return esql.exp`COALESCE(${ruleBackedCol}, true) == true`;
  }
}

// NB: `next` must not contain a top-level `OR` — the Composer strips syntactic
// parens, so `a AND b OR c` binds as `(a AND b) OR c` under ES|QL precedence.
function andWhere(current: WhereCondition | undefined, next: WhereCondition): WhereCondition {
  return current ? esql.exp`${current} AND ${next}` : next;
}

function termsQuery<T extends string>(
  field: T,
  values: Array<TermQueryFieldValue | undefined> | null | undefined
): QueryDslQueryContainer[] {
  if (values === null || values === undefined || values.length === 0) {
    return [];
  }

  const filteredValues = values.filter((value) => value !== undefined) as TermQueryFieldValue[];

  return [{ terms: { [field]: filteredValues } }];
}

function rangeGteQuery(field: string, value?: number): QueryDslQueryContainer[] {
  if (value === undefined) return [];
  return [{ range: { [field]: { gte: value } } }];
}

function escapeWildcard(input: string): string {
  return input.replace(/[\\*?]/g, '\\$&');
}

function wildcardQuery<T extends string>(
  field: T,
  value: TermQueryFieldValue | undefined,
  opts: { boost?: number } = {}
): QueryDslQueryContainer[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [
    {
      wildcard: {
        [field]: {
          value: `*${escapeWildcard(String(value))}*`,
          case_insensitive: true,
          ...(opts.boost !== undefined && { boost: opts.boost }),
        },
      },
    },
  ];
}

function buildKeywordQuery(
  query: string,
  filter: QueryDslQueryContainer[]
): QueryDslQueryContainer {
  return {
    bool: {
      filter,
      should: [
        ...wildcardQuery(QUERY_TITLE, query, { boost: 3 }),
        ...wildcardQuery(QUERY_DESCRIPTION, query, { boost: 2 }),
        ...wildcardQuery(QUERY_KQL_BODY, query),
        ...wildcardQuery(QUERY_FEATURE_NAME, query),
        ...wildcardQuery(QUERY_FEATURE_FILTER, query),
      ],
      minimum_should_match: 1,
    },
  };
}

// Appends the keyword-search pipeline. EVAL CASE boosts mirror the DSL
// `wildcard(boost: N)` ranking (title ×3, description ×2, others ×1).
// Caller is responsible for `SET unmapped_fields="LOAD"` if querying legacy
// `_source`-only fields.
function appendQueryKeywordEsqlPipeline(
  searchTerm: string,
  size: number,
  extraWhere?: WhereCondition
): ComposerQuery {
  const lowerWildcard = esql.str(`*${escapeWildcard(searchTerm.toLowerCase())}*`);
  const titleCol = normalizeColumn(QUERY_TITLE);
  const descCol = normalizeColumn(QUERY_DESCRIPTION);
  const kqlCol = normalizeColumn(QUERY_KQL_BODY);
  const featureNameCol = normalizeColumn(QUERY_FEATURE_NAME);
  const featureFilterCol = normalizeColumn(QUERY_FEATURE_FILTER);

  const keywordWhere: WhereCondition = esql.exp`TO_LOWER(${titleCol}) LIKE ${lowerWildcard}
   OR TO_LOWER(${descCol}) LIKE ${lowerWildcard}
   OR TO_LOWER(${kqlCol}) LIKE ${lowerWildcard}
   OR TO_LOWER(${featureNameCol}) LIKE ${lowerWildcard}
   OR TO_LOWER(${featureFilterCol}) LIKE ${lowerWildcard}`;

  const finalWhere = extraWhere ? esql.exp`${extraWhere} AND (${keywordWhere})` : keywordWhere;

  return esql`WHERE ${finalWhere}
    | EVAL _kw_title_hit = CASE(TO_LOWER(${titleCol}) LIKE ${lowerWildcard}, 3.0, 0.0)
    | EVAL _kw_desc_hit = CASE(TO_LOWER(${descCol}) LIKE ${lowerWildcard}, 2.0, 0.0)
    | EVAL _kw_kql_hit = CASE(TO_LOWER(${kqlCol}) LIKE ${lowerWildcard}, 1.0, 0.0)
    | EVAL _kw_fn_hit = CASE(TO_LOWER(${featureNameCol}) LIKE ${lowerWildcard}, 1.0, 0.0)
    | EVAL _kw_ff_hit = CASE(TO_LOWER(${featureFilterCol}) LIKE ${lowerWildcard}, 1.0, 0.0)
    | EVAL _kw_score = _kw_title_hit + _kw_desc_hit + _kw_kql_hit + _kw_fn_hit + _kw_ff_hit
    | SORT _kw_score DESC, _id ASC
    | KEEP _id, _source
    | LIMIT ${esql.num(size)}`;
}

export function getQueryLinkUuid(name: string, asset: Pick<QueryLink, 'asset.id' | 'asset.type'>) {
  return objectHash({
    [STREAM_NAME]: name,
    [ASSET_ID]: asset[ASSET_ID],
    [ASSET_TYPE]: asset[ASSET_TYPE],
  });
}

function toQueryLink<TQueryLink extends QueryLinkRequest>(
  definition: Streams.all.Definition,
  asset: TQueryLink
): QueryLink {
  return {
    ...asset,
    [ASSET_UUID]: getQueryLinkUuid(definition.name, asset),
    stream_name: definition.name,
  };
}

type QueryLinkStorageFields = Omit<QueryLink, 'query' | 'stream_name'> & {
  [QUERY_TITLE]: string;
  [QUERY_DESCRIPTION]: string;
  [QUERY_ESQL_QUERY]: string;
  [QUERY_SEVERITY_SCORE]?: number;
  [QUERY_TYPE]?: string;
  [QUERY_FEATURES]?: QueryFeature[];
};

export type StoredQueryLink = QueryLinkStorageFields & {
  [STREAM_NAME]: string;
};

interface QueryStorageBulkIndexOperation {
  index: { asset: QueryLinkRequest };
}
interface QueryStorageBulkDeleteOperation {
  delete: { asset: QueryUnlinkRequest };
}

type QueryStorageBulkOperation = QueryStorageBulkIndexOperation | QueryStorageBulkDeleteOperation;

function fromStorage(link: StoredQueryLink): QueryLink {
  const esqlQuery = link[QUERY_ESQL_QUERY];
  const storedType = link[QUERY_TYPE] as QueryType | undefined;

  // Trust the persisted type when present (set by toStorage and migration).
  // Only derive from ES|QL for pre-migration docs that lack the field.
  const type: QueryType = storedType ?? deriveQueryType(esqlQuery);

  const ruleBacked = type === QUERY_TYPE_STATS ? false : link[RULE_BACKED];

  return {
    [ASSET_UUID]: link[ASSET_UUID],
    [ASSET_ID]: link[ASSET_ID],
    [ASSET_TYPE]: link[ASSET_TYPE],
    stream_name: link[STREAM_NAME],
    rule_backed: ruleBacked,
    rule_id: link[RULE_ID],
    query: {
      id: link[ASSET_ID],
      type,
      title: link[QUERY_TITLE],
      description: link[QUERY_DESCRIPTION],
      esql: {
        query: esqlQuery,
      },
      severity_score: link[QUERY_SEVERITY_SCORE],
      features: link[QUERY_FEATURES],
      // QUERY_EVIDENCE ('experimental.query.evidence') lives under the dynamic-disabled
      // 'experimental' object, so it can't be added to QueryLinkStorageFields without
      // breaking the IStorageClient Exact type check.
      evidence: (link as Record<string, unknown>)[QUERY_EVIDENCE] as string[] | undefined,
    },
  };
}

function mapSearchHits<TSearchRequest extends StorageClientSearchRequest>(
  response: StorageClientSearchResponse<StoredQueryLink, TSearchRequest>
) {
  return response.hits.hits.map((hit) => fromStorage(hit._source));
}

export function buildSearchEmbeddingText(
  query: Pick<StreamQuery, 'title' | 'description'>,
  streamName?: string
): string {
  const parts: string[] = [];
  if (streamName) {
    parts.push(`Stream: ${streamName}`);
  }
  parts.push(`Title: ${query.title}`);
  if (query.description) {
    parts.push(`Description: ${query.description}`);
  }
  return parts.join('\n');
}

function toStorage(
  definition: Streams.all.Definition,
  request: QueryLinkRequest,
  includeEmbedding: boolean
): StoredQueryLink {
  const link = toQueryLink(definition, request);
  const { query, stream_name, ...rest } = link;
  const derivedType = deriveQueryType(query.esql.query);
  const embeddingText = buildSearchEmbeddingText(query, definition.name);
  return {
    ...rest,
    [STREAM_NAME]: definition.name,
    [QUERY_TITLE]: query.title,
    [QUERY_DESCRIPTION]: query.description,
    [QUERY_ESQL_QUERY]: query.esql.query,
    [QUERY_SEVERITY_SCORE]: query.severity_score,
    [QUERY_TYPE]: derivedType,
    [QUERY_EVIDENCE]: query.evidence,
    [QUERY_FEATURES]: query.features,
    [RULE_BACKED]: request.rule_backed,
    [RULE_ID]: link.rule_id,
    ...(includeEmbedding && embeddingText ? { [QUERY_SEARCH_EMBEDDING]: embeddingText } : {}),
  } as StoredQueryLink;
}

function hasBreakingChange(currentQuery: StreamQuery, nextQuery: StreamQuery): boolean {
  return !hasSameEsql(currentQuery.esql.query, nextQuery.esql.query);
}

function toQueryLinkFromQuery({
  query,
  stream,
  ruleBacked = true,
}: {
  query: StreamQuery;
  stream: string;
  ruleBacked?: boolean;
}): QueryLink {
  // Always derive type from the ES|QL source of truth to prevent stale
  // query.type from causing rule_backed mismatches.
  const derivedType = deriveQueryType(query.esql.query);
  const effectiveRuleBacked = derivedType === QUERY_TYPE_STATS ? false : ruleBacked;
  const assetUuid = getQueryLinkUuid(stream, { 'asset.type': 'query', 'asset.id': query.id });
  return {
    'asset.uuid': assetUuid,
    'asset.type': 'query',
    'asset.id': query.id,
    query,
    stream_name: stream,
    rule_backed: effectiveRuleBacked,
    rule_id: computeRuleId(assetUuid, query.esql.query),
  };
}

/** Operations accepted by {@link QueryClient.bulk} (stream queries + id deletes). */
export interface QueryClientBulkOperation {
  index?: StreamQuery;
  delete?: { id: string };
}
/** Index-only bulk operation for {@link QueryClient.bulk}. */
export interface QueryClientBulkIndexOperation {
  index: StreamQuery;
}

export class QueryClient {
  constructor(
    private readonly dependencies: {
      storageClient: IStorageClient<QueryStorageSettings, StoredQueryLink>;
      soClient: SavedObjectsClientContract;
      rulesManagementClient: IRulesManagementClient;
      logger: Logger;
    },
    private readonly isSignificantEventsEnabled: boolean = false,
    private readonly config: Pick<
      SigEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant'
    > = DEFAULT_SIG_EVENTS_TUNING_CONFIG
  ) {}

  // ==================== Storage Operations ====================

  async syncQueryList(
    definition: Streams.all.Definition,
    links: QueryLinkRequest[]
  ): Promise<{ deleted: QueryLink[]; indexed: QueryLink[] }> {
    const name = definition.name;
    const response = await this.dependencies.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`LIMIT ${esql.num(SEARCH_SIZE_LIMIT)}`,
      filter: {
        bool: { filter: [...termQuery(STREAM_NAME, name), ...termQuery(ASSET_TYPE, 'query')] },
      },
    });
    const existingQueryLinks = mapSourceRows<StoredQueryLink, QueryLink>(response, fromStorage);

    const nextQueryLinks = links.map((link) => {
      const ql = { ...toQueryLink(definition, link), rule_backed: link.rule_backed };
      if (deriveQueryType(ql.query.esql.query) === QUERY_TYPE_STATS) {
        ql.rule_backed = false;
      }
      return ql;
    });

    const nextIds = new Set(nextQueryLinks.map((link) => link[ASSET_UUID]));
    const queryLinksDeleted = existingQueryLinks.filter((link) => !nextIds.has(link[ASSET_UUID]));

    const operations: QueryStorageBulkOperation[] = [
      ...queryLinksDeleted.map((asset) => ({ delete: { asset } })),
      ...nextQueryLinks.map((asset) => ({ index: { asset } })),
    ];

    if (operations.length) {
      await this.bulkStorage(definition, operations);
    }

    return {
      deleted: queryLinksDeleted,
      indexed: nextQueryLinks,
    };
  }

  async unlinkQuery(name: string, asset: QueryUnlinkRequest): Promise<void> {
    const id = getQueryLinkUuid(name, asset);

    const { result } = await this.dependencies.storageClient.delete({ id });
    if (result === 'not_found') {
      throw new AssetNotFoundError(`${asset[ASSET_TYPE]} not found`);
    }
  }

  async clean() {
    await this.dependencies.storageClient.clean();
  }

  async getStreamToQueryLinksMap(names: string[]): Promise<Record<string, QueryLink[]>> {
    const filterClauses = [...termsQuery(STREAM_NAME, names), ...termQuery(ASSET_TYPE, 'query')];

    const response = await this.dependencies.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`LIMIT ${esql.num(SEARCH_SIZE_LIMIT)}`,
      filter: { bool: { filter: filterClauses } },
    });

    const queriesPerName = names.reduce((acc, name) => {
      acc[name] = [];
      return acc;
    }, {} as Record<string, QueryLink[]>);

    const sourceIdx = getSourceColumnIndex(response);
    if (sourceIdx === -1) return queriesPerName;

    for (const row of response.values) {
      const source = row[sourceIdx] as StoredQueryLink;
      const name = source[STREAM_NAME];
      if (!queriesPerName[name]) {
        this.dependencies.logger.warn(
          `Skipping query asset with unexpected stream_name "${name}" (requested: ${names.join(
            ', '
          )})`
        );
        continue;
      }
      queriesPerName[name].push(fromStorage(source));
    }

    return queriesPerName;
  }

  /**
   * Returns all query links for given streams or
   * all query links if no stream names are provided.
   */
  async getQueryLinks(streamNames: string[], filters?: QueryLinkFilters): Promise<QueryLink[]> {
    const filterClauses = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...termQuery(ASSET_TYPE, 'query'),
      ...termsQuery(ASSET_ID, filters?.queryIds),
      ...ruleUnbackedFilter(filters?.ruleUnbacked),
      ...rangeGteQuery(QUERY_SEVERITY_SCORE, filters?.minSeverityScore),
    ];

    const response = await this.dependencies.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`LIMIT ${esql.num(SEARCH_SIZE_LIMIT)}`,
      filter: { bool: { filter: filterClauses } },
    });

    return mapSourceRows<StoredQueryLink, QueryLink>(response, fromStorage);
  }

  /**
   * Returns the raw unbacked set for a stream, including STATS. Used by
   * {@link promoteQueries} to count STATS it must skip. For the promotable
   * set (STATS excluded), use {@link getPromotableUnbackedQueries}.
   */
  private async getUnbackedQueries(streamName: string): Promise<QueryLink[]> {
    return this.getQueryLinks([streamName], { ruleUnbacked: 'only' });
  }

  /**
   * Shared bool-query shape for the promotable-unbacked set: `rule_backed=false`
   * AND `type != STATS`, with optional severity floor. Used by
   * {@link getPromotableUnbackedQueries} and {@link promoteUnbackedQueries}.
   */
  private promotableUnbackedBoolQuery(filters?: { minSeverityScore?: number }) {
    return {
      filter: [
        ...termQuery(ASSET_TYPE, 'query'),
        ...termQuery(RULE_BACKED, false),
        ...rangeGteQuery(QUERY_SEVERITY_SCORE, filters?.minSeverityScore),
      ],
      must_not: termQuery(QUERY_TYPE, QUERY_TYPE_STATS),
    };
  }

  /**
   * Returns all unbacked, non-STATS queries across streams.
   */
  async getPromotableUnbackedQueries(filters?: {
    minSeverityScore?: number;
  }): Promise<QueryLink[]> {
    const response = await this.dependencies.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`LIMIT ${esql.num(SEARCH_SIZE_LIMIT)}`,
      filter: { bool: this.promotableUnbackedBoolQuery(filters) },
    });

    return mapSourceRows<StoredQueryLink, QueryLink>(response, fromStorage);
  }

  /**
   * Promotes the promotable-unbacked set (filtered by `queryIds` if provided)
   * to rule-backed status, grouped by stream.
   *
   * Non-obvious behavior:
   * - `queryIds` referring to STATS/backed/missing queries are silently
   *   dropped, so `skipped_stats` is reliably `0` from this entry point.
   * - `streamDefinitions` is injected because `streamsClient` is not a
   *   `QueryClient` dependency; callers build it from `listStreams()`.
   */
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
      this.dependencies.logger.debug(
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
        this.dependencies.logger.warn(`Skipping promotion for missing stream ${streamName}`);
        continue;
      }
      const result = await this.promoteQueries(definition, ids);
      promoted += result.promoted;
      skippedStats += result.skipped_stats;
    }

    return { promoted, skipped_stats: skippedStats };
  }

  async bulkGetByIds(name: string, ids: string[]): Promise<QueryLink[]> {
    if (ids.length === 0) return [];

    // ES|QL `IN (?param)` does not expand array params — emit one literal per value.
    const uuids = ids.map((id) =>
      getQueryLinkUuid(name, { [ASSET_TYPE]: 'query', [ASSET_ID]: id })
    );
    const idLiterals = uuids.map((uuid) => esql.str(uuid));

    const response = await this.dependencies.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: esql`WHERE _id IN (${idLiterals}) AND ${normalizeColumn(STREAM_NAME)} == ${{
        name,
      }} AND ${normalizeColumn(ASSET_TYPE)} == ${esql.str('query')} | LIMIT ${esql.num(
        uuids.length
      )}`,
    });

    return mapSourceRows<StoredQueryLink, QueryLink>(response, fromStorage);
  }

  async findQueries(
    streamNames: string[],
    query: string,
    filters?: QueryLinkFilters,
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    return searchWithKeywordFallback(
      this.dependencies.logger,
      { searchMode, label: 'Query', streamNames },
      (mode) => this.executeFindQueries(mode, streamNames, query, filters)
    );
  }

  private async executeFindQueries(
    mode: SearchMode,
    streamNames: string[],
    query: string,
    filters?: QueryLinkFilters
  ): Promise<QueryLink[]> {
    // Semantic and hybrid paths stay on DSL: ES|QL has no equivalent of the
    // linear / RRF retrievers with semantic min_score.
    if (mode === 'hybrid' || mode === 'semantic') {
      const dslFilter = [
        ...termsQuery(STREAM_NAME, streamNames),
        ...termQuery(ASSET_TYPE, 'query'),
        ...termsQuery(ASSET_ID, filters?.queryIds),
        ...ruleUnbackedFilter(filters?.ruleUnbacked),
        ...rangeGteQuery(QUERY_SEVERITY_SCORE, filters?.minSeverityScore),
      ];
      return mode === 'hybrid'
        ? this.findQueriesByHybrid(dslFilter, query)
        : this.findQueriesBySemantic(dslFilter, query);
    }

    // Build the base WHERE (stream filter + asset.type + optional rule-backed +
    // optional queryIds + optional minSeverityScore). Mirrors the filter set
    // applied by `getQueryLinks` so the no-query and query-search paths stay
    // behaviourally aligned for the same `QueryLinkFilters` input.
    let baseWhere: WhereCondition | undefined;
    // Omit the IN fragment when no streams are requested — bare `IN ()` is an ES|QL parse error.
    if (streamNames.length > 0) {
      const streamLiterals = streamNames.map((sn) => esql.str(sn));
      baseWhere = andWhere(
        baseWhere,
        esql.exp`${normalizeColumn(STREAM_NAME)} IN (${streamLiterals})`
      );
    }
    baseWhere = andWhere(
      baseWhere,
      esql.exp`${normalizeColumn(ASSET_TYPE)} == ${esql.str('query')}`
    );
    const rb = ruleUnbackedWhere(filters?.ruleUnbacked);
    if (rb !== null) baseWhere = andWhere(baseWhere, rb);
    if (filters?.queryIds && filters.queryIds.length > 0) {
      const queryIdLiterals = filters.queryIds.map((id) => esql.str(id));
      baseWhere = andWhere(
        baseWhere,
        esql.exp`${normalizeColumn(ASSET_ID)} IN (${queryIdLiterals})`
      );
    }
    if (filters?.minSeverityScore !== undefined) {
      baseWhere = andWhere(
        baseWhere,
        esql.exp`${normalizeColumn(QUERY_SEVERITY_SCORE)} >= ${esql.num(filters.minSeverityScore)}`
      );
    }

    return this.findQueriesByKeyword(baseWhere, query);
  }

  private async findQueriesByKeyword(
    baseWhere: WhereCondition | undefined,
    query: string,
    size: number = SEARCH_SIZE_LIMIT
  ): Promise<QueryLink[]> {
    // `SET unmapped_fields="LOAD"` lets legacy `experimental.query.system.*` fields
    // (mapped `dynamic:false`) be queried from `_source`.
    const response = await this.dependencies.storageClient.esql({
      metadata: ['_id', '_source'],
      pipeline: appendQueryKeywordEsqlPipeline(query, size, baseWhere),
      setOptions: { unmapped_fields: 'LOAD' },
    });

    return mapSourceRows<StoredQueryLink, QueryLink>(response, fromStorage);
  }

  private async findQueriesBySemantic(
    filter: QueryDslQueryContainer[],
    query: string
  ): Promise<QueryLink[]> {
    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      retriever: {
        linear: {
          retrievers: [
            {
              retriever: {
                standard: {
                  query: {
                    match: { [QUERY_SEARCH_EMBEDDING]: query },
                  },
                  filter: { bool: { filter } },
                },
              },
              weight: 1,
              normalizer: 'minmax',
            },
          ],
          rank_window_size: SEARCH_SIZE_LIMIT,
          min_score: this.config.semantic_min_score,
        },
      },
    });

    return mapSearchHits(assetsResponse);
  }

  private async findQueriesByHybrid(
    filter: QueryDslQueryContainer[],
    query: string
  ): Promise<QueryLink[]> {
    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      runtime_mappings: LEGACY_RUNTIME_MAPPINGS,
      retriever: {
        rrf: {
          retrievers: [
            {
              standard: {
                // Keyword leg uses empty filter — stream/asset filters are
                // applied at the RRF level to avoid double-filtering.
                query: buildKeywordQuery(query, []),
              },
            },
            {
              linear: {
                retrievers: [
                  {
                    retriever: {
                      standard: {
                        query: {
                          match: { [QUERY_SEARCH_EMBEDDING]: query },
                        },
                      },
                    },
                    weight: 1,
                    normalizer: 'minmax',
                  },
                ],
                rank_window_size: SEARCH_SIZE_LIMIT,
                min_score: this.config.semantic_min_score,
              },
            },
          ],
          filter: {
            bool: {
              filter,
            },
          },
          rank_window_size: SEARCH_SIZE_LIMIT,
          // Lower than the ES default (60) to give more weight to top-ranked
          // results from each retriever, improving precision for small catalogs.
          rank_constant: this.config.rrf_rank_constant,
        },
      },
    });

    return mapSearchHits(assetsResponse);
  }

  private async bulkStorage(
    definition: Streams.all.Definition,
    operations: QueryStorageBulkOperation[]
  ) {
    return await bulkWithInferenceFallback(this.dependencies.logger, ({ includeEmbedding }) =>
      this.dependencies.storageClient.bulk({
        operations: operations.map((operation) => {
          if ('index' in operation) {
            const document = toStorage(definition, operation.index.asset, includeEmbedding);
            return {
              index: {
                document,
                _id: document[ASSET_UUID],
              },
            };
          }

          const id = getQueryLinkUuid(definition.name, operation.delete.asset);
          return {
            delete: {
              _id: id,
            },
          };
        }),
        throwOnFail: true,
      })
    );
  }

  async getAssets(name: string): Promise<Query[]> {
    const { [name]: queryLinks } = await this.getStreamToQueryLinksMap([name]);

    if (queryLinks.length === 0) {
      return [];
    }

    return queryLinks.map((link) => {
      return {
        [ASSET_ID]: link[ASSET_ID],
        [ASSET_UUID]: link[ASSET_UUID],
        [ASSET_TYPE]: link[ASSET_TYPE],
        query: link.query,
        title: link.query.title,
        stream_name: link.stream_name,
        rule_backed: link.rule_backed,
        rule_id: link.rule_id,
      };
    });
  }

  // ==================== Query Sync with Rules ====================

  public async syncQueries(definition: Streams.all.Definition, queries: StreamQuery[]) {
    const stream = definition.name;

    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping syncQueries for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    /**
     * This method is used to synchronize queries/rules for a stream.
     * It manages the rules associated with these queries, ensuring that any query breaking changes
     * are handled appropriately:
     * - If a query is new, it creates a new rule.
     * - If a query is updated with a breaking change, it removes the old rule and creates a new one.
     * - If a query is updated without a breaking change, it updates the existing rule.
     * - If a query is deleted, it removes the associated rule.
     */
    const { [stream]: currentQueryLinks } = await this.getStreamToQueryLinksMap([stream]);
    const currentLinkByQueryId = new Map(currentQueryLinks.map((link) => [link.query.id, link]));
    const nextIds = new Set(queries.map((query) => query.id));

    const nextQueriesToCreate: QueryLink[] = [];
    const nextQueriesUpdatedWithBreakingChange: QueryLink[] = [];
    const nextQueriesUpdatedWithoutBreakingChange: QueryLink[] = [];
    const demotedToStats: QueryLink[] = [];
    const allNextQueryLinks: QueryLink[] = [];

    for (const query of queries) {
      const currentLink = currentLinkByQueryId.get(query.id);
      const isStats = deriveQueryType(query.esql.query) === QUERY_TYPE_STATS;
      if (!currentLink) {
        const link = toQueryLinkFromQuery({ query, stream });
        nextQueriesToCreate.push(link);
        allNextQueryLinks.push(link);
      } else if (!currentLink.rule_backed || isStats) {
        if (currentLink.rule_backed && isStats) {
          demotedToStats.push(currentLink);
        }
        allNextQueryLinks.push({ ...currentLink, query, rule_backed: false });
      } else if (hasBreakingChange(currentLink.query, query)) {
        const link = toQueryLinkFromQuery({ query, stream });
        nextQueriesUpdatedWithBreakingChange.push(link);
        allNextQueryLinks.push(link);
      } else {
        const link = { ...currentLink, query };
        nextQueriesUpdatedWithoutBreakingChange.push(link);
        allNextQueryLinks.push(link);
      }
    }

    // Only delete rule-backed queries that are no longer in the input list.
    const currentQueriesToDelete = currentQueryLinks.filter(
      (link) => link.rule_backed && !nextIds.has(link.query.id)
    );
    const staleBreakingChangeRules = currentQueryLinks.filter((link) =>
      nextQueriesUpdatedWithBreakingChange.some((updated) => updated.query.id === link.query.id)
    );

    const isRuleBacked = (link: QueryLink) => link.rule_backed;
    const toCreate = [...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange].filter(
      isRuleBacked
    );
    const toUpdate = nextQueriesUpdatedWithoutBreakingChange.filter(isRuleBacked);

    // Install replacements first so new rules start firing before the stale ones
    // are removed — breaking-change rules have distinct rule_ids so both can coexist
    // briefly, avoiding a monitoring coverage gap.
    try {
      await this.installQueries(toCreate, toUpdate, definition);
    } catch (installError) {
      this.dependencies.logger.error(
        `installQueries failed during syncQueries for stream "${definition.name}". ` +
          `Attempting to uninstall partially created rules before re-throwing.`
      );
      // Only compensate toCreate — toUpdate rules existed before this call
      // and must not be deleted if the failure occurred during the create phase.
      await this.uninstallQueries(toCreate).catch((compensateError) => {
        this.dependencies.logger.error(
          `Failed to compensate after installQueries failure for stream "${definition.name}": ` +
            `${
              compensateError instanceof Error ? compensateError.message : String(compensateError)
            }`
        );
      });
      throw installError;
    }

    await this.uninstallQueries([
      ...currentQueriesToDelete,
      ...staleBreakingChangeRules,
      ...demotedToStats,
    ]);

    try {
      await this.syncQueryList(
        definition,
        allNextQueryLinks.map((link) => ({
          [ASSET_ID]: link[ASSET_ID],
          [ASSET_TYPE]: link[ASSET_TYPE],
          query: link.query,
          rule_backed: link.rule_backed,
          rule_id: link.rule_id,
        }))
      );
    } catch (syncError) {
      this.dependencies.logger.error(
        `syncQueryList failed after installQueries for stream "${definition.name}". ` +
          `Attempting to uninstall newly created rules to avoid orphans.`
      );
      await this.uninstallQueries(toCreate).catch((compensateError) => {
        this.dependencies.logger.error(
          `Failed to compensate after syncQueryList failure for stream "${definition.name}": ` +
            `${
              compensateError instanceof Error ? compensateError.message : String(compensateError)
            }`
        );
      });
      throw syncError;
    }
  }

  public async upsert(definition: Streams.all.Definition, query: StreamQuery) {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping upsert for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    await this.bulk(definition, [{ index: query }]);
  }

  public async delete(definition: Streams.all.Definition, queryId: string) {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping delete for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    await this.bulk(definition, [{ delete: { id: queryId } }]);
  }

  public async deleteAll(definition: Streams.all.Definition) {
    const stream = definition.name;
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping deleteAll for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentQueryLinks } = await this.getStreamToQueryLinksMap([stream]);
    const queriesToDelete = currentQueryLinks.map((link) => ({ delete: { id: link.query.id } }));
    await this.bulk(definition, queriesToDelete);
  }

  public async bulk(
    definition: Streams.all.Definition,
    operations: QueryClientBulkOperation[],
    options?: { createRules?: boolean }
  ) {
    const stream = definition.name;

    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping bulk update for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentQueryLinks } = await this.getStreamToQueryLinksMap([stream]);
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const indexOperationsMap = new Map(
      operations.flatMap((operation) =>
        operation.index ? [[operation.index.id, operation.index] as const] : []
      )
    );
    const deleteOperationIds = new Set(
      operations.flatMap((operation) => (operation.delete ? [operation.delete.id] : []))
    );

    const nextQueries: QueryLink[] = [
      ...currentQueryLinks
        .filter((link) => !deleteOperationIds.has(link.query.id))
        .map((link) => {
          const update = indexOperationsMap.get(link.query.id);
          return update ? { ...link, query: update } : link;
        }),
      ...operations.flatMap((operation) =>
        operation.index && !currentIds.has(operation.index.id)
          ? [
              toQueryLinkFromQuery({
                query: operation.index,
                stream,
                ruleBacked: options?.createRules !== false,
              }),
            ]
          : []
      ),
    ];

    if (options?.createRules === false) {
      await this.syncQueryList(
        definition,
        nextQueries.map((link) => ({
          [ASSET_ID]: link[ASSET_ID],
          [ASSET_TYPE]: link[ASSET_TYPE],
          query: link.query,
          rule_backed: link.rule_backed,
          rule_id: link.rule_id,
        }))
      );
      return;
    }

    await this.syncQueries(
      definition,
      nextQueries.map((link) => link.query)
    );
  }

  /**
   * Creates Kibana rules for stored queries that do not have a backing rule, then marks them as backed.
   */
  public async promoteQueries(
    definition: Streams.all.Definition,
    queryIds: string[]
  ): Promise<{ promoted: number; skipped_stats: number }> {
    const streamName = definition.name;

    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping promoteQueries because significant events feature is disabled.`
      );
      return { promoted: 0, skipped_stats: 0 };
    }

    const unbacked = await this.getUnbackedQueries(streamName);
    const idSet = new Set(queryIds);
    const candidates = unbacked.filter((link) => idSet.has(link.query.id));

    const skippedStats = candidates.filter((link) => link.query.type === QUERY_TYPE_STATS);
    if (skippedStats.length > 0) {
      this.dependencies.logger.info(
        `Skipping ${skippedStats.length} STATS queries from promotion for stream "${streamName}" (not yet supported as rules).`
      );
    }

    const toPromote = candidates
      .filter((link) => link.query.type !== QUERY_TYPE_STATS)
      .map((link) => toQueryLinkFromQuery({ query: link.query, stream: streamName }));

    if (toPromote.length === 0) {
      return { promoted: 0, skipped_stats: skippedStats.length };
    }

    await this.installQueries(toPromote, [], definition);

    try {
      await this.bulkStorage(
        definition,
        toPromote.map((link) => ({
          index: {
            asset: {
              [ASSET_ID]: link[ASSET_ID],
              [ASSET_TYPE]: link[ASSET_TYPE],
              query: link.query,
              rule_backed: true,
              rule_id: link.rule_id,
            },
          },
        }))
      );
    } catch (storageError) {
      this.dependencies.logger.error(
        `Storage update failed after installing rules for stream "${streamName}". Attempting to uninstall orphaned rules.`
      );
      await this.uninstallQueries(toPromote).catch((uninstallError) => {
        this.dependencies.logger.error(
          `Failed to compensate — orphaned rules may remain for stream "${streamName}": ${
            uninstallError instanceof Error ? uninstallError.message : String(uninstallError)
          }`
        );
      });
      throw storageError;
    }

    return { promoted: toPromote.length, skipped_stats: skippedStats.length };
  }

  /**
   * Removes backing Kibana rules for stored rule-backed queries, then marks them as unbacked.
   */
  public async demoteQueries(
    definition: Streams.all.Definition,
    queryIds: string[]
  ): Promise<{ demoted: number }> {
    const streamName = definition.name;

    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping demoteQueries because significant events feature is disabled.`
      );
      return { demoted: 0 };
    }

    const { [streamName]: currentQueryLinks } = await this.getStreamToQueryLinksMap([streamName]);
    const idSet = new Set(queryIds);
    const toDemote = currentQueryLinks.filter(
      (link) => link.rule_backed && idSet.has(link.query.id)
    );

    if (toDemote.length === 0) {
      return { demoted: 0 };
    }

    // Uninstall rules first: if this fails, storage still shows rule_backed=true
    // which is correct since the rule is still running.
    await this.uninstallQueries(toDemote);

    await this.bulkStorage(
      definition,
      toDemote.map((link) => ({
        index: {
          asset: {
            [ASSET_ID]: link[ASSET_ID],
            [ASSET_TYPE]: link[ASSET_TYPE],
            query: link.query,
            rule_backed: false,
            rule_id: link.rule_id,
          },
        },
      }))
    );

    return { demoted: toDemote.length };
  }

  private async installQueries(
    queriesToCreate: QueryLink[],
    queriesToUpdate: QueryLink[],
    definition: Streams.all.Definition
  ) {
    const { rulesManagementClient } = this.dependencies;
    const limiter = pLimit(10);

    await Promise.all([
      ...queriesToCreate.map((query) =>
        limiter(() =>
          rulesManagementClient.createRule(query.rule_id, this.toCreateRuleBody(query, definition))
        )
      ),
      ...queriesToUpdate.map((query) =>
        limiter(() =>
          rulesManagementClient.updateRule(query.rule_id, this.toUpdateRuleBody(query, definition))
        )
      ),
    ]);
  }

  private async uninstallQueries(queries: QueryLink[]) {
    if (queries.length === 0) {
      return;
    }

    const { rulesManagementClient } = this.dependencies;
    const ruleIds = queries.map((q) => q.rule_id);
    await rulesManagementClient.bulkDeleteRules(ruleIds);
  }

  private toCreateRuleBody(queryLink: QueryLink, definition: Streams.all.Definition) {
    const { query } = queryLink;

    return {
      name: query.title,
      consumer: STREAMS_RULE_CONSUMER,
      alertTypeId: STREAMS_ESQL_RULE_TYPE_ID,
      actions: [] as never[],
      params: {
        timestampField: '@timestamp',
        query: query.esql.query,
      },
      enabled: true,
      tags: ['streams', definition.name],
      schedule: {
        interval: '1m',
      },
    };
  }

  private toUpdateRuleBody(queryLink: QueryLink, definition: Streams.all.Definition) {
    const { query } = queryLink;

    return {
      name: query.title,
      actions: [] as never[],
      params: {
        timestampField: '@timestamp',
        query: query.esql.query,
      },
      tags: ['streams', definition.name],
      schedule: {
        interval: '1m',
      },
    };
  }
}
