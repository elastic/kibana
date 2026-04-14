/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isBoom } from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  IStorageClient,
  StorageClientSearchRequest,
  StorageClientSearchResponse,
} from '@kbn/storage-adapter';
import { deriveQueryType } from '@kbn/streams-schema/src/helpers/esql_helpers';
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
import type { EsqlRuleParams } from '../../../sig_events/rules/esql/types';

import { AssetNotFoundError } from '../../errors/asset_not_found_error';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_EVIDENCE,
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
import { parseError } from '../../errors/parse_error';
import { computeRuleId } from './helpers/query';
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
};

export type StoredQueryLink = QueryLinkStorageFields & {
  [STREAM_NAME]: string;
};

interface QueryBulkIndexOperation {
  index: { asset: QueryLinkRequest };
}
interface QueryBulkDeleteOperation {
  delete: { asset: QueryUnlinkRequest };
}

export type QueryBulkOperation = QueryBulkIndexOperation | QueryBulkDeleteOperation;

function fromStorage(link: StoredQueryLink): QueryLink {
  const esql = link[QUERY_ESQL_QUERY];
  const storedType = link[QUERY_TYPE] as QueryType | undefined;

  // Trust the persisted type when present (set by toStorage and migration).
  // Only derive from ES|QL for pre-migration docs that lack the field.
  const type: QueryType = storedType ?? deriveQueryType(esql);

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
        query: esql,
      },
      severity_score: link[QUERY_SEVERITY_SCORE],
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
  inferenceAvailable: boolean
): StoredQueryLink {
  const link = toQueryLink(definition, request);
  const { query, stream_name, ...rest } = link;
  const derivedType = deriveQueryType(query.esql.query);
  return {
    ...rest,
    [STREAM_NAME]: definition.name,
    [QUERY_TITLE]: query.title,
    [QUERY_DESCRIPTION]: query.description,
    [QUERY_ESQL_QUERY]: query.esql.query,
    [QUERY_SEVERITY_SCORE]: query.severity_score,
    [QUERY_TYPE]: derivedType,
    [QUERY_EVIDENCE]: query.evidence,
    [RULE_BACKED]: request.rule_backed,
    [RULE_ID]: link.rule_id,
    ...(inferenceAvailable
      ? { [QUERY_SEARCH_EMBEDDING]: buildSearchEmbeddingText(query, definition.name) }
      : {}),
  } as StoredQueryLink;
}

function hasBreakingChange(currentQuery: StreamQuery, nextQuery: StreamQuery): boolean {
  return currentQuery.esql.query !== nextQuery.esql.query;
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

export class QueryClient {
  constructor(
    private readonly dependencies: {
      storageClient: IStorageClient<QueryStorageSettings, StoredQueryLink>;
      soClient: SavedObjectsClientContract;
      rulesClient: RulesClient;
      logger: Logger;
    },
    private readonly isSignificantEventsEnabled: boolean = false,
    private readonly inferenceAvailable: boolean = false,
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
    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name), ...termQuery(ASSET_TYPE, 'query')],
        },
      },
    });

    const existingQueryLinks = mapSearchHits(assetsResponse);

    const nextQueryLinks = links.map((link) => {
      const ql = { ...toQueryLink(definition, link), rule_backed: link.rule_backed };
      if (deriveQueryType(ql.query.esql.query) === QUERY_TYPE_STATS) {
        ql.rule_backed = false;
      }
      return ql;
    });

    const nextIds = new Set(nextQueryLinks.map((link) => link[ASSET_UUID]));
    const queryLinksDeleted = existingQueryLinks.filter((link) => !nextIds.has(link[ASSET_UUID]));

    const operations: QueryBulkOperation[] = [
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
    const filters = [...termsQuery(STREAM_NAME, names), ...termQuery(ASSET_TYPE, 'query')];

    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
    });

    const queriesPerName = names.reduce((acc, name) => {
      acc[name] = [];
      return acc;
    }, {} as Record<string, QueryLink[]>);

    assetsResponse.hits.hits.forEach((hit) => {
      const name = hit._source[STREAM_NAME];
      if (!queriesPerName[name]) {
        this.dependencies.logger.warn(
          `Skipping query asset with unexpected stream_name "${name}" (requested: ${names.join(
            ', '
          )})`
        );
        return;
      }
      const asset = fromStorage(hit._source);
      queriesPerName[name].push(asset);
    });

    return queriesPerName;
  }

  /**
   * Returns all query links for given streams or
   * all query links if no stream names are provided.
   */
  async getQueryLinks(streamNames: string[], filters?: QueryLinkFilters): Promise<QueryLink[]> {
    const filter = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...termQuery(ASSET_TYPE, 'query'),
      ...termsQuery(ASSET_ID, filters?.queryIds),
      ...ruleUnbackedFilter(filters?.ruleUnbacked),
      ...rangeGteQuery(QUERY_SEVERITY_SCORE, filters?.minSeverityScore),
    ];

    const queriesResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      query: {
        bool: {
          filter,
        },
      },
    });

    return mapSearchHits(queriesResponse);
  }

  /**
   * Returns all unbacked query links for a stream, including STATS.
   * Callers (e.g. {@link promoteQueries}) are responsible for filtering
   * STATS queries and reporting skipped counts to the client.
   */
  private async getUnbackedQueries(streamName: string): Promise<QueryLink[]> {
    return this.getQueryLinks([streamName], { ruleUnbacked: 'only' });
  }

  /**
   * Returns the count of all query links across streams that do not have a backing Kibana rule.
   *
   * Pre-migration docs lacking QUERY_TYPE are safe here: STATS queries were
   * introduced alongside the type field, so any doc without it is a match query.
   * syncQueries backfills the type for all docs it touches.
   */
  async getUnbackedQueriesCount(filters?: { minSeverityScore?: number }): Promise<number> {
    const filter = [
      ...termQuery(ASSET_TYPE, 'query'),
      ...termQuery(RULE_BACKED, false),
      ...rangeGteQuery(QUERY_SEVERITY_SCORE, filters?.minSeverityScore),
    ];

    const assetsResponse = await this.dependencies.storageClient.search({
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter,
          must_not: termQuery(QUERY_TYPE, QUERY_TYPE_STATS),
        },
      },
    });

    const total = assetsResponse.hits.total;
    return typeof total === 'number' ? total : total?.value ?? 0;
  }

  /**
   * Returns all query links across streams that do not have a backing Kibana rule.
   */
  async getAllUnbackedQueries(filters?: { minSeverityScore?: number }): Promise<QueryLink[]> {
    return this.getQueryLinks([], {
      ruleUnbacked: 'only',
      minSeverityScore: filters?.minSeverityScore,
    });
  }

  async bulkGetByIds(name: string, ids: string[]) {
    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(STREAM_NAME, name),
            ...termQuery(ASSET_TYPE, 'query'),
            ...termsQuery(
              '_id',
              ids.map((id) => getQueryLinkUuid(name, { [ASSET_TYPE]: 'query', [ASSET_ID]: id }))
            ),
          ],
        },
      },
    });

    return mapSearchHits(assetsResponse);
  }

  async findQueries(
    streamNames: string[],
    query: string,
    filters?: QueryLinkFilters,
    searchMode?: SearchMode
  ): Promise<QueryLink[]> {
    const effectiveMode = this.resolveSearchMode(searchMode);

    try {
      return await this.executeFindQueries(effectiveMode, streamNames, query, filters);
    } catch (error) {
      // Only fall back silently when the mode was auto-resolved (no explicit
      // searchMode from the caller). If the caller explicitly requested a
      // non-keyword mode, propagate the error so they know their request failed.
      if (effectiveMode !== 'keyword' && !searchMode) {
        const { message } = parseError(error);
        this.dependencies.logger.warn(
          `Search mode "${effectiveMode}" failed, falling back to keyword: ${message}`
        );
        return await this.executeFindQueries('keyword', streamNames, query, filters);
      }
      throw error;
    }
  }

  private resolveSearchMode(searchMode?: SearchMode): SearchMode {
    if (searchMode) {
      if (searchMode !== 'keyword' && !this.inferenceAvailable) {
        this.dependencies.logger.debug(
          `Search mode "${searchMode}" requested but inference is unavailable, falling back to keyword`
        );
        return 'keyword';
      }
      return searchMode;
    }
    return this.inferenceAvailable ? 'hybrid' : 'keyword';
  }

  private async executeFindQueries(
    mode: SearchMode,
    streamNames: string[],
    query: string,
    filters?: QueryLinkFilters
  ): Promise<QueryLink[]> {
    const filter = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...termQuery(ASSET_TYPE, 'query'),
      ...ruleUnbackedFilter(filters?.ruleUnbacked),
    ];

    if (mode === 'keyword') {
      return this.findQueriesByKeyword(filter, query);
    }

    if (mode === 'semantic') {
      return this.findQueriesBySemantic(filter, query);
    }

    return this.findQueriesByHybrid(filter, query);
  }

  private async findQueriesByKeyword(
    filter: QueryDslQueryContainer[],
    query: string
  ): Promise<QueryLink[]> {
    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      runtime_mappings: LEGACY_RUNTIME_MAPPINGS,
      query: buildKeywordQuery(query, filter),
    });

    return mapSearchHits(assetsResponse);
  }

  private async findQueriesBySemantic(
    filter: QueryDslQueryContainer[],
    query: string
  ): Promise<QueryLink[]> {
    const assetsResponse = await this.dependencies.storageClient.search({
      size: SEARCH_SIZE_LIMIT,
      track_total_hits: false,
      retriever: {
        standard: {
          query: {
            match: { [QUERY_SEARCH_EMBEDDING]: query },
          },
          filter: { bool: { filter } },
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
              standard: {
                query: {
                  match: { [QUERY_SEARCH_EMBEDDING]: query },
                },
                // See config.semantic_min_score for rationale.
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

  private async bulkStorage(definition: Streams.all.Definition, operations: QueryBulkOperation[]) {
    return await this.dependencies.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = toStorage(definition, operation.index.asset, this.inferenceAvailable);
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
    });
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
    const currentQueriesToDeleteBeforeUpdate = currentQueryLinks.filter((link) =>
      nextQueriesUpdatedWithBreakingChange.some((updated) => updated.query.id === link.query.id)
    );

    await this.uninstallQueries([
      ...currentQueriesToDelete,
      ...currentQueriesToDeleteBeforeUpdate,
      ...demotedToStats,
    ]);
    const isRuleBacked = (link: QueryLink) => link.rule_backed;
    const toCreate = [...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange].filter(
      isRuleBacked
    );
    const toUpdate = nextQueriesUpdatedWithoutBreakingChange.filter(isRuleBacked);

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
    operations: Array<{ index?: StreamQuery; delete?: { id: string } }>,
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

    await this.uninstallQueries(toDemote);

    return { demoted: toDemote.length };
  }

  private async installQueries(
    queriesToCreate: QueryLink[],
    queriesToUpdate: QueryLink[],
    definition: Streams.all.Definition
  ) {
    const { rulesClient } = this.dependencies;
    const limiter = pLimit(10);

    await Promise.all([
      ...queriesToCreate.map((query) => {
        return limiter(() =>
          rulesClient
            .create<EsqlRuleParams>(this.toCreateRuleParams(query, definition))
            .catch((error) => {
              if (isBoom(error) && error.output.statusCode === 409) {
                return rulesClient.update<EsqlRuleParams>(
                  this.toUpdateRuleParams(query, definition)
                );
              }
              throw error;
            })
        );
      }),
      ...queriesToUpdate.map((query) => {
        return limiter(() =>
          rulesClient
            .update<EsqlRuleParams>(this.toUpdateRuleParams(query, definition))
            .catch((error) => {
              if (isBoom(error) && error.output.statusCode === 404) {
                return rulesClient.create<EsqlRuleParams>(
                  this.toCreateRuleParams(query, definition)
                );
              }
              throw error;
            })
        );
      }),
    ]);
  }

  private async uninstallQueries(queries: QueryLink[]) {
    if (queries.length === 0) {
      return;
    }

    const { rulesClient, logger } = this.dependencies;
    const ruleIds = queries.map((q) => q.rule_id);
    await rulesClient
      .bulkDeleteRules({ ids: ruleIds, ignoreInternalRuleTypes: false })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 400) {
          logger.warn(
            `bulkDeleteRules returned 400 for ${ruleIds.length} rule(s) — some rules may not have existed: ${error.message}`
          );
          return;
        }
        throw error;
      });
  }

  private toCreateRuleParams(queryLink: QueryLink, definition: Streams.all.Definition) {
    const { rule_id: ruleId, query } = queryLink;

    return {
      data: {
        name: query.title,
        consumer: 'streams',
        alertTypeId: 'streams.rules.esql',
        actions: [],
        params: {
          timestampField: '@timestamp',
          query: query.esql.query,
        },
        enabled: true,
        tags: ['streams', definition.name],
        schedule: {
          interval: '1m',
        },
      },
      options: {
        id: ruleId,
      },
    };
  }

  private toUpdateRuleParams(queryLink: QueryLink, definition: Streams.all.Definition) {
    const { rule_id: ruleId, query } = queryLink;

    return {
      id: ruleId,
      data: {
        name: query.title,
        actions: [],
        params: {
          timestampField: '@timestamp',
          query: query.esql.query,
        },
        tags: ['streams', definition.name],
        schedule: {
          interval: '1m',
        },
      },
    };
  }
}
