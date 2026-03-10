/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsMultiBucketAggregateBase,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { isBoom } from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { IScopedClusterClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { IStorageClient } from '@kbn/storage-adapter';
import type {
  GetQueriesFilters,
  QueryLinkFilters,
  QueryRuleOccurrences,
  RuleUnbackedFilter,
  StreamQuery,
  StreamQueryCategory,
  StreamQuerySource,
  StreamQueryType,
  Streams,
} from '@kbn/streams-schema';
import { isArray } from 'lodash';
import objectHash from 'object-hash';
import pLimit from 'p-limit';
import {
  type Query,
  type QueryLink,
  type QueryLinkRequest,
  type QueryUnlinkRequest,
} from '../../../../../common/queries';
import type { EsqlRuleParams } from '../../../rules/esql/types';
import { AssetNotFoundError } from '../../errors/asset_not_found_error';
import type { QUERY_FEATURE_TYPE } from '../fields';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_AFFECTED_STREAMS,
  QUERY_CATEGORY,
  QUERY_CREATED_AT,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_EVIDENCE,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  QUERY_KQL_BODY,
  QUERY_MODEL,
  QUERY_SEVERITY_SCORE,
  QUERY_SOURCE,
  QUERY_TAGS,
  QUERY_TITLE,
  QUERY_TYPE,
  QUERY_UPDATED_AT,
  RULE_BACKED,
  RULE_ID,
  STREAM_NAME,
} from '../fields';
import type { QueryStorageSettings } from '../storage_settings';
import { parseError } from '../../errors/parse_error';
import { SecurityError } from '../../errors/security_error';
import { computeRuleId } from './helpers/query';

type TermQueryFieldValue = string | boolean | number | null;

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

function wildcardQuery<T extends string>(
  field: T,
  value: TermQueryFieldValue | undefined
): QueryDslQueryContainer[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [{ wildcard: { [field]: { value: `*${value}*`, case_insensitive: true } } }];
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
  [QUERY_ESQL_QUERY]: string;
  [QUERY_AFFECTED_STREAMS]?: string[];
  [QUERY_SEVERITY_SCORE]?: number;
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

interface QueryRuleOccurrencesFilter {
  queryId?: string | string[];
}

function fromStorage(link: StoredQueryLink): QueryLink {
  const storageFields: QueryLinkStorageFields & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
    [QUERY_FEATURE_TYPE]: 'system';
    [QUERY_EVIDENCE]?: string[];
    [RULE_BACKED]?: boolean;
    [QUERY_DESCRIPTION]?: string;
    [QUERY_TYPE]?: StreamQueryType;
    [QUERY_CATEGORY]?: StreamQueryCategory;
    [QUERY_TAGS]?: string[];
    [QUERY_SOURCE]?: StreamQuerySource;
    [QUERY_AFFECTED_STREAMS]?: string[];
    [QUERY_MODEL]?: string;
    [QUERY_CREATED_AT]?: string;
    [QUERY_UPDATED_AT]?: string;
  } = link as StoredQueryLink & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
    [QUERY_FEATURE_TYPE]: 'system';
    [QUERY_EVIDENCE]?: string[];
    [RULE_BACKED]?: boolean;
    [QUERY_DESCRIPTION]?: string;
    [QUERY_TYPE]?: StreamQueryType;
    [QUERY_CATEGORY]?: StreamQueryCategory;
    [QUERY_TAGS]?: string[];
    [QUERY_AFFECTED_STREAMS]?: string[];
    [QUERY_MODEL]?: string;
    [QUERY_CREATED_AT]?: string;
    [QUERY_UPDATED_AT]?: string;
  };

  return {
    ...storageFields,
    stream_name: link[STREAM_NAME],
    rule_backed: storageFields[RULE_BACKED],
    rule_id: storageFields[RULE_ID],
    query: {
      id: storageFields[ASSET_ID],
      title: storageFields[QUERY_TITLE],
      affected_streams: storageFields[QUERY_AFFECTED_STREAMS] ?? [link[STREAM_NAME]],
      /**
       * The storageClient migrateSource converts the `kql` and `feature` filter to esql, making safe their removal here.
       */
      esql: {
        query: storageFields[QUERY_ESQL_QUERY],
      },
      severity_score: storageFields[QUERY_SEVERITY_SCORE],
      evidence: storageFields[QUERY_EVIDENCE],
      description: storageFields[QUERY_DESCRIPTION],
      type: storageFields[QUERY_TYPE] ?? 'match',
      category: storageFields[QUERY_CATEGORY] ?? 'operational',
      tags: storageFields[QUERY_TAGS] ?? [],
      source: storageFields[QUERY_SOURCE],
      model: storageFields[QUERY_MODEL],
      created_at: storageFields[QUERY_CREATED_AT],
      updated_at: storageFields[QUERY_UPDATED_AT],
    },
  } satisfies QueryLink;
}

function toStorage(definition: Streams.all.Definition, request: QueryLinkRequest): StoredQueryLink {
  const link = toQueryLink(definition, request);
  const { query, stream_name, ...rest } = link;
  return {
    ...rest,
    [STREAM_NAME]: definition.name,
    [QUERY_TITLE]: query.title,
    [QUERY_ESQL_QUERY]: query.esql.query,
    [QUERY_SEVERITY_SCORE]: query.severity_score,
    [QUERY_EVIDENCE]: query.evidence,
    [QUERY_DESCRIPTION]: query.description,
    [QUERY_TYPE]: query.type,
    [QUERY_CATEGORY]: query.category,
    [QUERY_TAGS]: query.tags,
    [QUERY_AFFECTED_STREAMS]: query.affected_streams,
    [QUERY_SOURCE]: query.source,
    [QUERY_MODEL]: query.model,
    [QUERY_CREATED_AT]: query.created_at,
    [QUERY_UPDATED_AT]: query.updated_at,
    [RULE_BACKED]: request.rule_backed,
    [RULE_ID]: link.rule_id,
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
  const assetUuid = getQueryLinkUuid(stream, { 'asset.type': 'query', 'asset.id': query.id });
  return {
    'asset.uuid': assetUuid,
    'asset.type': 'query',
    'asset.id': query.id,
    query,
    stream_name: stream,
    rule_backed: ruleBacked,
    rule_id: computeRuleId(assetUuid, query.esql.query),
  };
}

export class QueryClient {
  constructor(
    private readonly dependencies: {
      storageClient: IStorageClient<QueryStorageSettings, StoredQueryLink>;
      soClient: SavedObjectsClientContract;
      rulesClient: RulesClient;
      scopedClusterClient: IScopedClusterClient;
      logger: Logger;
    },
    private readonly isSignificantEventsEnabled: boolean = false
  ) {}

  // ==================== Storage Operations ====================

  async syncQueryList(
    definition: Streams.all.Definition,
    links: QueryLinkRequest[]
  ): Promise<{ deleted: QueryLink[]; indexed: QueryLink[] }> {
    const name = definition.name;
    const assetsResponse = await this.dependencies.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...termQuery(STREAM_NAME, name), ...termQuery(ASSET_TYPE, 'query')],
        },
      },
    });

    const existingQueryLinks = assetsResponse.hits.hits.map((hit) => {
      return fromStorage(hit._source);
    });

    const nextQueryLinks = links.map((link) => {
      return { ...toQueryLink(definition, link), rule_backed: link.rule_backed };
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
      size: 10_000,
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
      ...ruleUnbackedFilter(filters?.ruleUnbacked),
    ];

    const queriesResponse = await this.dependencies.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter,
        },
      },
    });

    return queriesResponse.hits.hits.map((hit) => fromStorage(hit._source));
  }

  /**
   * Returns queries optionally filtered by stream, type/category/source, and full-text query.
   */
  async getQueries(filters?: GetQueriesFilters): Promise<StreamQuery[]> {
    const streamNames = filters?.streamName
      ? Array.isArray(filters.streamName)
        ? filters.streamName
        : [filters.streamName]
      : [];

    const filter = [
      ...termQuery(ASSET_TYPE, 'query'),
      ...termsQuery(QUERY_AFFECTED_STREAMS, streamNames),
      ...termsQuery(QUERY_TYPE, filters?.type),
      ...termsQuery(QUERY_CATEGORY, filters?.category),
      ...termsQuery(QUERY_SOURCE, filters?.source),
      ...ruleUnbackedFilter(filters?.ruleUnbacked),
    ];

    const should = [
      ...wildcardQuery(QUERY_TITLE, filters?.search),
      ...wildcardQuery(QUERY_DESCRIPTION, filters?.search),
      ...wildcardQuery(QUERY_ESQL_QUERY, filters?.search),
      ...wildcardQuery(QUERY_EVIDENCE, filters?.search),
    ];

    const query: QueryDslQueryContainer = {
      bool: {
        filter,
        ...(should.length > 0 ? { should, minimum_should_match: 1 } : {}),
      },
    };

    const queriesResponse = await this.dependencies.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      query,
    });

    return queriesResponse.hits.hits.map((hit) => fromStorage(hit._source).query);
  }

  /**
   * Returns an aggregated occurrences histogram across all selected query rules.
   */
  async getQueryRuleOccurrences(params: {
    from: Date;
    to: Date;
    bucketSize: string;
    filter?: QueryRuleOccurrencesFilter;
  }): Promise<QueryRuleOccurrences> {
    const { from, to, bucketSize, filter } = params;

    const queryIds = filter?.queryId
      ? Array.isArray(filter.queryId)
        ? filter.queryId
        : [filter.queryId]
      : [];

    const queryLinks = await this.getQueryLinks([]);
    const filteredQueryLinks =
      queryIds.length > 0
        ? queryLinks.filter((queryLink) => queryIds.includes(queryLink.query.id))
        : queryLinks;

    if (filteredQueryLinks.length === 0) {
      return { buckets: [], total: 0 };
    }

    const ruleIds = filteredQueryLinks.map((queryLink) =>
      computeRuleId(queryLink[ASSET_UUID], queryLink.query.esql.query)
    );

    const response = await this.dependencies.scopedClusterClient.asCurrentUser
      .search<
        unknown,
        {
          aggregated_occurrences: AggregationsMultiBucketAggregateBase<{
            key_as_string: string;
            key: number;
            doc_count: number;
          }>;
        }
      >({
        index: '.alerts-streams.alerts-default',
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: from.toISOString(),
                    lte: to.toISOString(),
                  },
                },
              },
              {
                terms: {
                  'kibana.alert.rule.uuid': ruleIds,
                },
              },
            ],
          },
        },
        aggs: {
          aggregated_occurrences: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: bucketSize,
              extended_bounds: {
                min: from.toISOString(),
                max: to.toISOString(),
              },
            },
          },
        },
      })
      .catch((error) => {
        const { type, message } = parseError(error);
        if (type === 'security_exception') {
          throw new SecurityError(
            `Cannot read query rule occurrences, insufficient privileges: ${message}`,
            { cause: error }
          );
        }
        throw error;
      });

    const aggregatedOccurrencesBuckets = response.aggregations?.aggregated_occurrences?.buckets;
    const buckets = isArray(aggregatedOccurrencesBuckets)
      ? aggregatedOccurrencesBuckets.map((bucket) => ({
          date: bucket.key_as_string,
          count: bucket.doc_count,
        }))
      : [];
    const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

    return {
      buckets,
      total,
    };
  }

  /**
   * Returns the count of all query links across streams that do not have a backing Kibana rule.
   */
  async getUnbackedQueriesCount(): Promise<number> {
    const filter = [...termQuery(ASSET_TYPE, 'query'), ...termQuery(RULE_BACKED, false)];

    const assetsResponse = await this.dependencies.storageClient.search({
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter,
        },
      },
    });

    const total = assetsResponse.hits.total;
    return typeof total === 'number' ? total : total?.value ?? 0;
  }

  /**
   * Returns all query links across streams that do not have a backing Kibana rule.
   */
  async getAllUnbackedQueries(): Promise<QueryLink[]> {
    return this.getQueryLinks([], { ruleUnbacked: 'only' });
  }

  async bulkGetByIds(name: string, ids: string[]) {
    const assetsResponse = await this.dependencies.storageClient.search({
      size: 10_000,
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

    return assetsResponse.hits.hits.map((hit) => fromStorage(hit._source));
  }

  async findQueries(
    streamNames: string[],
    query: string,
    filters?: QueryLinkFilters
  ): Promise<QueryLink[]> {
    const filter = [
      ...termsQuery(STREAM_NAME, streamNames),
      ...termQuery(ASSET_TYPE, 'query'),
      ...ruleUnbackedFilter(filters?.ruleUnbacked),
    ];

    const assetsResponse = await this.dependencies.storageClient.search({
      size: 10_000,
      track_total_hits: false,
      runtime_mappings: {
        [QUERY_FEATURE_NAME]: { type: 'keyword' },
        [QUERY_FEATURE_FILTER]: { type: 'keyword' },
      },
      query: {
        bool: {
          filter,
          should: [
            ...wildcardQuery(QUERY_TITLE, query),
            ...wildcardQuery(QUERY_KQL_BODY, query),
            ...wildcardQuery(QUERY_FEATURE_NAME, query),
            ...wildcardQuery(QUERY_FEATURE_FILTER, query),
          ],
          minimum_should_match: 1,
        },
      },
    });

    return assetsResponse.hits.hits.map((hit) => fromStorage(hit._source));
  }

  private async bulkStorage(definition: Streams.all.Definition, operations: QueryBulkOperation[]) {
    return await this.dependencies.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = toStorage(
            definition,
            Object.values(operation)[0].asset as QueryLinkRequest
          );
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
    const allNextQueryLinks: QueryLink[] = [];

    for (const query of queries) {
      const currentLink = currentLinkByQueryId.get(query.id);
      if (!currentLink) {
        const link = toQueryLinkFromQuery({ query, stream });
        nextQueriesToCreate.push(link);
        allNextQueryLinks.push(link);
      } else if (!currentLink.rule_backed) {
        // Unbacked queries have no rule, so breaking-change handling doesn't apply.
        // Preserve the link as-is and update only the query content.
        allNextQueryLinks.push({ ...currentLink, query });
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

    await this.uninstallQueries([...currentQueriesToDelete, ...currentQueriesToDeleteBeforeUpdate]);
    await this.installQueries(
      [...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange],
      nextQueriesUpdatedWithoutBreakingChange,
      definition
    );

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
    const currentQueriesById = new Map<string, StreamQuery>(
      currentQueryLinks.map((link) => [link.query.id, link.query] as const)
    );
    const timestamp = new Date().toISOString();
    const indexOperationsMap = new Map<string, StreamQuery>(
      operations
        .filter((operation) => operation.index)
        .map((operation) => {
          const nextQuery = operation.index!;
          const currentQuery = currentQueriesById.get(nextQuery.id);
          const query: StreamQuery = {
            ...nextQuery,
            affected_streams: [stream],
            created_at: currentQuery?.created_at ?? timestamp,
            updated_at: currentQuery ? timestamp : undefined,
          };

          return [nextQuery.id, query] as const;
        })
    );
    const deleteOperationIds = new Set(
      operations.filter((operation) => operation.delete).map((operation) => operation.delete!.id)
    );

    const nextQueries: QueryLink[] = [
      ...currentQueryLinks
        .filter((link) => !deleteOperationIds.has(link.query.id))
        .map((link) => {
          const update = indexOperationsMap.get(link.query.id);
          return update ? { ...link, query: update } : link;
        }),
      ...operations
        .filter((operation) => operation.index && !currentIds.has(operation.index.id))
        .map((operation) =>
          toQueryLinkFromQuery({
            query: indexOperationsMap.get(operation.index!.id)!,
            stream,
            ruleBacked: options?.createRules !== false,
          })
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
  ): Promise<{ promoted: number }> {
    const streamName = definition.name;

    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping promoteQueries because significant events feature is disabled.`
      );
      return { promoted: 0 };
    }

    const unbacked = await this.getQueryLinks([streamName], { ruleUnbacked: 'only' });
    const idSet = new Set(queryIds);
    const toPromote = unbacked
      .filter((link) => idSet.has(link.query.id))
      .map((link) => toQueryLinkFromQuery({ query: link.query, stream: streamName }));

    if (toPromote.length === 0) {
      return { promoted: 0 };
    }

    await this.installQueries(toPromote, [], definition);

    const bulkOperations = toPromote.map((link) => {
      const document = toStorage(definition, {
        [ASSET_ID]: link[ASSET_ID],
        [ASSET_TYPE]: link[ASSET_TYPE],
        query: link.query,
        rule_backed: true,
        rule_id: link.rule_id,
      });
      return {
        index: {
          document,
          _id: document[ASSET_UUID],
        },
      };
    });
    await this.dependencies.storageClient.bulk({
      operations: bulkOperations,
      throwOnFail: true,
    });

    return { promoted: toPromote.length };
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

    const { rulesClient } = this.dependencies;
    const ruleIds = queries.map((q) => q.rule_id);
    await rulesClient
      .bulkDeleteRules({ ids: ruleIds, ignoreInternalRuleTypes: false })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 400) {
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
