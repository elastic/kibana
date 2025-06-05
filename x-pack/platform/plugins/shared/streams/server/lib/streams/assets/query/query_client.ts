/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { Logger } from '@kbn/core/server';
import { StreamQuery } from '@kbn/streams-schema';
import { QueryLink } from '../../../../../common/assets';
import { StreamsConfig } from '../../../../../common/config';
import { EsqlRuleParams } from '../../../rules/esql/types';
import { AssetClient, getUuid } from '../asset_client';
import { ASSET_ID, ASSET_TYPE } from '../fields';
import { getKqlAsCommandArg, getRuleIdFromQueryLink } from './helpers/query';

function hasBreakingChange(currentQuery: StreamQuery, nextQuery: StreamQuery): boolean {
  return currentQuery.kql.query !== nextQuery.kql.query;
}

function toQueryLink(query: StreamQuery, stream: string): QueryLink {
  return {
    'asset.uuid': getUuid(stream, { 'asset.type': 'query', 'asset.id': query.id }),
    'asset.type': 'query',
    'asset.id': query.id,
    query,
  };
}

export class QueryClient {
  private readonly isSignificantEventsEnabled: boolean;

  constructor(
    private readonly dependencies: {
      assetClient: AssetClient;
      rulesClient: RulesClient;
      logger: Logger;
      config: StreamsConfig;
    }
  ) {
    this.isSignificantEventsEnabled =
      dependencies.config.experimental?.significantEventsEnabled ?? false;
  }

  public async syncQueries(stream: string, queries: StreamQuery[]) {
    if (!this.isSignificantEventsEnabled) {
      return await this.dependencies.assetClient.syncAssetList(
        stream,
        queries.map((query) => ({
          [ASSET_ID]: query.id,
          [ASSET_TYPE]: 'query' as const,
          query,
        })),
        'query'
      );
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
    const currentQueryLinks = await this.dependencies.assetClient.getAssetLinks(stream, ['query']);
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const nextIds = new Set(queries.map((query) => query.id));

    const nextQueriesToCreate = queries
      .filter((query) => !currentIds.has(query.id))
      .map((query) => toQueryLink(query, stream));

    const currentQueriesToDelete = currentQueryLinks.filter((link) => !nextIds.has(link.query.id));

    const currentQueriesToDeleteBeforeUpdate = currentQueryLinks.filter((link) =>
      queries.some((query) => query.id === link.query.id && hasBreakingChange(link.query, query))
    );

    const nextQueriesUpdatedWithBreakingChange = queries
      .filter((query) =>
        currentQueryLinks.some(
          (link) => link.query.id === query.id && hasBreakingChange(link.query, query)
        )
      )
      .map((query) => toQueryLink(query, stream));

    const nextQueriesUpdatedWithoutBreakingChange = queries
      .filter((query) =>
        currentQueryLinks.some(
          (link) => link.query.id === query.id && !hasBreakingChange(link.query, query)
        )
      )
      .map((query) => toQueryLink(query, stream));

    await this.uninstallQueries([...currentQueriesToDelete, ...currentQueriesToDeleteBeforeUpdate]);
    await this.installQueries(
      [...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange],
      nextQueriesUpdatedWithoutBreakingChange,
      stream
    );

    await this.dependencies.assetClient.syncAssetList(
      stream,
      queries.map((query) => ({
        [ASSET_ID]: query.id,
        [ASSET_TYPE]: 'query',
        query,
      })),
      'query'
    );
  }

  public async upsert(stream: string, query: StreamQuery) {
    const { assetClient } = this.dependencies;

    if (!this.isSignificantEventsEnabled) {
      return await assetClient.linkAsset(stream, {
        [ASSET_ID]: query.id,
        [ASSET_TYPE]: 'query',
        query,
      });
    }

    const currentQueryLinks = await this.dependencies.assetClient.getAssetLinks(stream, ['query']);
    const nextQueries = [
      ...currentQueryLinks.filter((link) => link.query.id !== query.id),
      toQueryLink(query, stream),
    ];

    await this.syncQueries(
      stream,
      nextQueries.map((link) => link.query)
    );
  }

  public async delete(stream: string, queryId: string) {
    const { assetClient } = this.dependencies;

    if (!this.isSignificantEventsEnabled) {
      return await assetClient.unlinkAsset(stream, {
        [ASSET_TYPE]: 'query',
        [ASSET_ID]: queryId,
      });
    }

    const currentQueryLinks = await this.dependencies.assetClient.getAssetLinks(stream, ['query']);
    const nextQueries = currentQueryLinks.filter((link) => link.query.id !== queryId);
    await this.syncQueries(
      stream,
      nextQueries.map((link) => link.query)
    );
  }

  public async bulkOperations(
    stream: string,
    operations: Array<{ index?: StreamQuery; delete?: { id: string } }>
  ) {
    const { assetClient } = this.dependencies;

    if (!this.isSignificantEventsEnabled) {
      return await assetClient.bulk(
        stream,
        operations.map((operation) => {
          if (operation.index) {
            return {
              index: {
                asset: {
                  [ASSET_TYPE]: 'query',
                  [ASSET_ID]: operation.index.id,
                  query: operation.index,
                },
              },
            };
          }
          return {
            delete: {
              asset: {
                [ASSET_TYPE]: 'query',
                [ASSET_ID]: operation.delete!.id,
              },
            },
          };
        })
      );
    }

    const currentQueryLinks = await this.dependencies.assetClient.getAssetLinks(stream, ['query']);
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
        .map((operation) => toQueryLink(operation.index!, stream)),
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

    await Promise.all([
      ...queriesToCreate.map((query) => {
        const ruleId = getRuleIdFromQueryLink(query);
        return rulesClient
          .create<EsqlRuleParams>({
            data: {
              name: query.query.title,
              consumer: 'streams',
              alertTypeId: 'streams.rules.esql',
              actions: [],
              params: {
                timestampField: '@timestamp',
                query: `FROM ${stream},${stream}.* METADATA _id, _source | WHERE KQL(\"${getKqlAsCommandArg(
                  query.query.kql.query
                )}\")`,
              },
              enabled: true,
              tags: ['streams'],
              schedule: {
                interval: '1m',
              },
            },
            options: {
              id: ruleId,
            },
          })
          .catch((error) => {
            if (isBoom(error) && error.output.statusCode === 409) {
              // If the rule already exists, we should update it instead
              return rulesClient.update<EsqlRuleParams>({
                id: ruleId,
                data: {
                  name: query.query.title,
                  actions: [],
                  params: {
                    timestampField: '@timestamp',
                    query: `FROM ${stream},${stream}.* METADATA _id, _source | WHERE KQL(\"${getKqlAsCommandArg(
                      query.query.kql.query
                    )}\")`,
                  },
                  tags: ['streams'],
                  schedule: {
                    interval: '1m',
                  },
                },
              });
            }
          });
      }),
      ...queriesToUpdate.map((query) => {
        const ruleId = getRuleIdFromQueryLink(query);
        return rulesClient
          .update<EsqlRuleParams>({
            id: ruleId,
            data: {
              name: query.query.title,
              actions: [],
              params: {
                timestampField: '@timestamp',
                query: `FROM ${stream},${stream}.* METADATA _id, _source | WHERE KQL(\"${getKqlAsCommandArg(
                  query.query.kql.query
                )}\")`,
              },
              tags: ['streams'],
              schedule: {
                interval: '1m',
              },
            },
          })
          .catch((error) => {
            if (isBoom(error) && error.output.statusCode === 404) {
              // If the rule does not exist, we should create it instead
              return rulesClient.create<EsqlRuleParams>({
                data: {
                  name: query.query.title,
                  consumer: 'streams',
                  alertTypeId: 'streams.rules.esql',
                  actions: [],
                  params: {
                    timestampField: '@timestamp',
                    query: `FROM ${stream},${stream}.* METADATA _id, _source | WHERE KQL(\"${getKqlAsCommandArg(
                      query.query.kql.query
                    )}\")`,
                  },
                  enabled: true,
                  tags: ['streams'],
                  schedule: {
                    interval: '1m',
                  },
                },
                options: {
                  id: ruleId,
                },
              });
            }
          });
      }),
    ]);
  }

  private async uninstallQueries(queries: QueryLink[]) {
    if (queries.length === 0) {
      return;
    }

    const { rulesClient } = this.dependencies;
    await rulesClient
      .bulkDeleteRules({ ids: queries.map(getRuleIdFromQueryLink) })
      .catch((error) => {
        if (isBoom(error) && error.output.statusCode === 400) {
          return;
        }
        throw error;
      });
  }
}
