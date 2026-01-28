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
import type { IStorageClient } from '@kbn/storage-adapter';
import type { StreamQuery } from '@kbn/streams-schema';
import { buildEsqlQuery } from '@kbn/streams-schema';
import { isEqual, map, partition } from 'lodash';
import objectHash from 'object-hash';
import pLimit from 'p-limit';
import type {
  Query,
  QueryLinkRequest,
  QueryUnlinkRequest,
  QueryLink,
} from '../../../../../common/queries';
import type { EsqlRuleParams } from '../../../rules/esql/types';
import { AssetNotFoundError } from '../../errors/asset_not_found_error';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_EVIDENCE,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  QUERY_FEATURE_TYPE,
  QUERY_KQL_BODY,
  QUERY_SEVERITY_SCORE,
  QUERY_TITLE,
  STREAM_NAME,
} from '../fields';
import type { QueryStorageSettings } from '../storage_settings';
import { getRuleIdFromQueryLink } from './helpers/query';

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

function termsQuery<T extends string>(
  field: T,
  values: Array<TermQueryFieldValue | undefined> | null | undefined
): QueryDslQueryContainer[] {
  if (values === null || values === undefined || values.length === 0) {
    return [];
  }

  const filteredValues = values.filter(
    (value) => value !== undefined
  ) as unknown as TermQueryFieldValue[];

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
  name: string,
  asset: TQueryLink
): QueryLink {
  return {
    ...asset,
    [ASSET_UUID]: getQueryLinkUuid(name, asset),
    stream_name: name,
  };
}

type QueryLinkStorageFields = Omit<QueryLink, 'query' | 'stream_name'> & {
  [QUERY_TITLE]: string;
  [QUERY_KQL_BODY]: string;
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

function fromStorage(link: StoredQueryLink): QueryLink {
  const storageFields: QueryLinkStorageFields & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
    [QUERY_FEATURE_TYPE]: 'system';
    [QUERY_EVIDENCE]?: string[];
  } = link as StoredQueryLink & {
    [QUERY_FEATURE_NAME]: string;
    [QUERY_FEATURE_FILTER]: string;
    [QUERY_FEATURE_TYPE]: 'system';
    [QUERY_EVIDENCE]?: string[];
  };
  return {
    ...storageFields,
    stream_name: link[STREAM_NAME],
    query: {
      id: storageFields[ASSET_ID],
      title: storageFields[QUERY_TITLE],
      kql: {
        query: storageFields[QUERY_KQL_BODY],
      },
      feature: storageFields[QUERY_FEATURE_NAME]
        ? {
            name: storageFields[QUERY_FEATURE_NAME],
            filter: JSON.parse(storageFields[QUERY_FEATURE_FILTER]),
            type: 'system',
          }
        : undefined,
      severity_score: storageFields[QUERY_SEVERITY_SCORE],
      evidence: storageFields[QUERY_EVIDENCE],
    },
  } satisfies QueryLink;
}

function toStorage(name: string, request: QueryLinkRequest): StoredQueryLink {
  const link = toQueryLink(name, request);
  const { query, stream_name, ...rest } = link;
  return {
    ...rest,
    [STREAM_NAME]: name,
    [QUERY_TITLE]: query.title,
    [QUERY_KQL_BODY]: query.kql.query,
    [QUERY_FEATURE_NAME]: query.feature ? query.feature.name : '',
    [QUERY_FEATURE_FILTER]: query.feature ? JSON.stringify(query.feature.filter) : '',
    [QUERY_FEATURE_TYPE]: query.feature ? query.feature.type : '',
    [QUERY_SEVERITY_SCORE]: query.severity_score,
    [QUERY_EVIDENCE]: query.evidence,
  } as unknown as StoredQueryLink;
}

function hasBreakingChange(currentQuery: StreamQuery, nextQuery: StreamQuery): boolean {
  return (
    currentQuery.kql.query !== nextQuery.kql.query ||
    !isEqual(currentQuery.feature, nextQuery.feature)
  );
}

function toQueryLinkFromQuery(query: StreamQuery, stream: string): QueryLink {
  return {
    'asset.uuid': getQueryLinkUuid(stream, { 'asset.type': 'query', 'asset.id': query.id }),
    'asset.type': 'query',
    'asset.id': query.id,
    query,
    stream_name: stream,
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
    private readonly isSignificantEventsEnabled: boolean = false
  ) {}

  // ==================== Storage Operations ====================

  async linkQuery(name: string, link: QueryLinkRequest): Promise<QueryLink> {
    const document = toStorage(name, link);

    await this.dependencies.storageClient.index({
      id: document[ASSET_UUID],
      document,
    });

    return toQueryLink(name, link);
  }

  async syncQueryList(
    name: string,
    links: QueryLinkRequest[]
  ): Promise<{ deleted: QueryLink[]; indexed: QueryLink[] }> {
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
      return toQueryLink(name, link);
    });

    const nextIds = new Set(nextQueryLinks.map((link) => link[ASSET_UUID]));
    const queryLinksDeleted = existingQueryLinks.filter((link) => !nextIds.has(link[ASSET_UUID]));

    const operations: QueryBulkOperation[] = [
      ...queryLinksDeleted.map((asset) => ({ delete: { asset } })),
      ...nextQueryLinks.map((asset) => ({ index: { asset } })),
    ];

    if (operations.length) {
      await this.bulkStorage(name, operations);
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
  async getQueryLinks(streamNames: string[]): Promise<QueryLink[]> {
    const filter = [...termsQuery(STREAM_NAME, streamNames), ...termQuery(ASSET_TYPE, 'query')];

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

  async findQueries(streamNames: string[], query: string): Promise<QueryLink[]> {
    const filter = [...termsQuery(STREAM_NAME, streamNames), ...termQuery(ASSET_TYPE, 'query')];

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

  private async bulkStorage(name: string, operations: QueryBulkOperation[]) {
    return await this.dependencies.storageClient.bulk({
      operations: operations.map((operation) => {
        if ('index' in operation) {
          const document = toStorage(name, Object.values(operation)[0].asset as QueryLinkRequest);
          return {
            index: {
              document,
              _id: document[ASSET_UUID],
            },
          };
        }

        const id = getQueryLinkUuid(name, operation.delete.asset);
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
      };
    });
  }

  // ==================== Query Sync with Rules ====================

  public async syncQueries(stream: string, queries: StreamQuery[]) {
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
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const nextIds = new Set(queries.map((query) => query.id));

    const nextQueriesToCreate = queries
      .filter((query) => !currentIds.has(query.id))
      .map((query) => toQueryLinkFromQuery(query, stream));

    const currentQueriesToDelete = currentQueryLinks.filter((link) => !nextIds.has(link.query.id));

    const currentQueriesToDeleteBeforeUpdate = currentQueryLinks.filter((link) =>
      queries.some((query) => query.id === link.query.id && hasBreakingChange(link.query, query))
    );

    const [nextQueriesUpdatedWithBreakingChange, nextQueriesUpdatedWithoutBreakingChange] = map(
      partition(
        queries.filter((query) => currentIds.has(query.id)),
        (query) => {
          const currentLink = currentQueryLinks.find((link) => link.query.id === query.id);
          return hasBreakingChange(currentLink!.query, query);
        }
      ),
      (partitionedQueries) => partitionedQueries.map((query) => toQueryLinkFromQuery(query, stream))
    );

    await this.uninstallQueries([...currentQueriesToDelete, ...currentQueriesToDeleteBeforeUpdate]);
    await this.installQueries(
      [...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange],
      nextQueriesUpdatedWithoutBreakingChange,
      stream
    );

    await this.syncQueryList(
      stream,
      queries.map((query) => ({
        [ASSET_ID]: query.id,
        [ASSET_TYPE]: 'query',
        query,
      }))
    );
  }

  public async upsert(stream: string, query: StreamQuery) {
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping upsert for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    await this.bulk(stream, [{ index: query }]);
  }

  public async delete(stream: string, queryId: string) {
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping delete for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    await this.bulk(stream, [{ delete: { id: queryId } }]);
  }

  public async deleteAll(stream: string) {
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping deleteAll for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentQueryLinks } = await this.getStreamToQueryLinksMap([stream]);
    const queriesToDelete = currentQueryLinks.map((link) => ({ delete: { id: link.query.id } }));
    await this.bulk(stream, queriesToDelete);
  }

  public async bulk(
    stream: string,
    operations: Array<{ index?: StreamQuery; delete?: { id: string } }>
  ) {
    if (!this.isSignificantEventsEnabled) {
      this.dependencies.logger.debug(
        `Skipping bulk update for stream "${stream}" because significant events feature is disabled.`
      );
      return;
    }

    const { [stream]: currentQueryLinks } = await this.getStreamToQueryLinksMap([stream]);
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const indexOperationsMap = new Map(
      operations
        .filter((operation) => operation.index)
        .map((operation) => [operation.index!.id, operation.index!])
    );
    const deleteOperationIds = new Set(
      operations.filter((operation) => operation.delete).map((operation) => operation.delete!.id)
    );

    const nextQueries = [
      ...currentQueryLinks
        .filter((link) => !deleteOperationIds.has(link.query.id))
        .map((link) => {
          const update = indexOperationsMap.get(link.query.id);
          return update ? { ...link, query: update } : link;
        }),
      ...operations
        .filter((operation) => operation.index && !currentIds.has(operation.index!.id))
        .map((operation) => toQueryLinkFromQuery(operation.index!, stream)),
    ];

    await this.syncQueries(
      stream,
      nextQueries.map((link) => link.query)
    );
  }

  private async installQueries(
    queriesToCreate: QueryLink[],
    queriesToUpdate: QueryLink[],
    stream: string
  ) {
    const { rulesClient } = this.dependencies;
    const limiter = pLimit(10);

    await Promise.all([
      ...queriesToCreate.map((query) => {
        return limiter(() =>
          rulesClient
            .create<EsqlRuleParams>(this.toCreateRuleParams(query, stream))
            .catch((error) => {
              if (isBoom(error) && error.output.statusCode === 409) {
                return rulesClient.update<EsqlRuleParams>(this.toUpdateRuleParams(query, stream));
              }
              throw error;
            })
        );
      }),
      ...queriesToUpdate.map((query) => {
        return limiter(() =>
          rulesClient
            .update<EsqlRuleParams>(this.toUpdateRuleParams(query, stream))
            .catch((error) => {
              if (isBoom(error) && error.output.statusCode === 404) {
                return rulesClient.create<EsqlRuleParams>(this.toCreateRuleParams(query, stream));
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
    await rulesClient
      .bulkDeleteRules({ ids: queries.map(getRuleIdFromQueryLink), ignoreInternalRuleTypes: false })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 400) {
          return;
        }
        throw error;
      });
  }

  private toCreateRuleParams(query: QueryLink, stream: string) {
    const ruleId = getRuleIdFromQueryLink(query);

    const esqlQuery = buildEsqlQuery([stream, `${stream}.*`], query.query, true);
    return {
      data: {
        name: query.query.title,
        consumer: 'streams',
        alertTypeId: 'streams.rules.esql',
        actions: [],
        params: {
          timestampField: '@timestamp',
          query: esqlQuery,
        },
        enabled: true,
        tags: ['streams', stream],
        schedule: {
          interval: '1m',
        },
      },
      options: {
        id: ruleId,
      },
    };
  }

  private toUpdateRuleParams(query: QueryLink, stream: string) {
    const ruleId = getRuleIdFromQueryLink(query);
    const esqlQuery = buildEsqlQuery([stream, `${stream}.*`], query.query, true);
    return {
      id: ruleId,
      data: {
        name: query.query.title,
        actions: [],
        params: {
          timestampField: '@timestamp',
          query: esqlQuery,
        },
        tags: ['streams', stream],
        schedule: {
          interval: '1m',
        },
      },
    };
  }
}
