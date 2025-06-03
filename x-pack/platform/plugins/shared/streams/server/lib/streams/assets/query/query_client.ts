/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { StreamQuery } from '@kbn/streams-schema';
import { QueryLink } from '../../../../../common/assets';
import { EsqlRuleParams } from '../../../rules/esql/types';
import { AssetClient, getUuid } from '../asset_client';
import { ASSET_ID, ASSET_TYPE } from '../fields';
import { getRuleIdFromQueryLink } from '../helpers/query';

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
  constructor(
    private readonly clients: {
      assetClient: AssetClient;
      rulesClient: RulesClient;
    }
  ) {}

  public async syncQueries(
    stream: string,
    queries: StreamQuery[],
    significantEventsEnabled: boolean
  ) {
    const { rulesClient } = this.clients;

    if (!significantEventsEnabled) {
      return await this.clients.assetClient.syncAssetList(
        stream,
        queries.map((query) => ({
          [ASSET_ID]: query.id,
          [ASSET_TYPE]: 'query' as const,
          query,
        }))
      );
    }

    // step 1: find the existing queries for the stream
    const currentQueryLinks = await this.clients.assetClient.getAssetLinks(stream, ['query']);

    // step 2: prepare the queries to create, update or delete
    // Find next queries to create
    const nextQueriesToCreate = queries
      .filter((query) => !currentQueryLinks.some((link) => link['asset.id'] === query.id))
      .map((query) => toQueryLink(query, stream));

    // Find current queries to delete
    const currentQueriesToDelete = currentQueryLinks.filter(
      (link) => !queries.some((query) => query.id === link['asset.id'])
    );

    // Find current queries to delete before creating the new ones
    // because the KQL query has changed and require a new rule
    const currentQueriesToDeleteBeforeUpdate = currentQueryLinks.filter((link) =>
      queries.some((query) => query.id === link['asset.id'] && hasBreakingChange(link.query, query))
    );

    // Find the next queries to create because they have been updated with a breaking change in KQL
    const nextQueriesUpdatedWithBreakingChange = queries
      .filter((query) =>
        currentQueryLinks.some(
          (link) => link['asset.id'] === query.id && hasBreakingChange(link.query, query)
        )
      )
      .map((query) => toQueryLink(query, stream));

    // Find the next queries to update directly because the change is not on the KQL query
    const nextQueriesUpdatedWithoutBreakingChange = queries
      .filter((query) =>
        currentQueryLinks.some(
          (link) => link['asset.id'] === query.id && !hasBreakingChange(link.query, query)
        )
      )
      .map((query) => toQueryLink(query, stream));

    // step 3: uninstall the queries that need to be deleted or updated because updated KQL
    await this.uninstallQueries([...currentQueriesToDelete, ...currentQueriesToDeleteBeforeUpdate]);

    // step 4: install the new queries, update the existing queries without breaking changes, and create the updated queries with breaking changes (that have been deleted)
    await Promise.all([
      ...nextQueriesUpdatedWithoutBreakingChange.map((query) => {
        const ruleId = getRuleIdFromQueryLink(query);
        return rulesClient.update<EsqlRuleParams>({
          id: ruleId,
          data: {
            name: query.query.title,
            actions: [],
            params: {
              timestampField: '@timestamp',
              query: `FROM ${stream},${stream}.* METADATA _id, _source | WHERE KQL(\"\"\"${query.query.kql.query}\"\"\")`,
            },
            tags: ['streams'],
            schedule: {
              interval: '1m',
            },
          },
        });
      }),
      ...[...nextQueriesToCreate, ...nextQueriesUpdatedWithBreakingChange].map((query) => {
        const ruleId = getRuleIdFromQueryLink(query);
        return rulesClient.create<EsqlRuleParams>({
          data: {
            name: query.query.title,
            consumer: 'streams',
            alertTypeId: 'streams.rules.esql',
            actions: [],
            params: {
              timestampField: '@timestamp',
              query: `FROM ${stream},${stream}.* METADATA _id, _source | WHERE KQL(\"\"\"${query.query.kql.query}\"\"\")`,
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
      }),
    ]);

    // step 5: finally sync the asset links
    await this.clients.assetClient.syncAssetList(
      stream,
      queries.map((query) => ({
        [ASSET_ID]: query.id,
        [ASSET_TYPE]: 'query',
        query,
      }))
    );
  }

  public async upsert(stream: string, query: StreamQuery, significantEventsEnabled: boolean) {
    const { assetClient } = this.clients;

    if (!significantEventsEnabled) {
      return await assetClient.linkAsset(stream, {
        [ASSET_ID]: query.id,
        [ASSET_TYPE]: 'query',
        query,
      });
    }

    const currentQueryLinks = await this.clients.assetClient.getAssetLinks(stream, ['query']);
    const nextQueries = [
      ...currentQueryLinks.filter((link) => link['asset.id'] !== query.id),
      toQueryLink(query, stream),
    ];

    await this.syncQueries(
      stream,
      nextQueries.map((link) => link.query),
      significantEventsEnabled
    );
  }

  public async delete(stream: string, queryId: string, significantEventsEnabled: boolean) {
    const { assetClient } = this.clients;

    if (!significantEventsEnabled) {
      return await assetClient.unlinkAsset(stream, {
        [ASSET_TYPE]: 'query',
        [ASSET_ID]: queryId,
      });
    }

    const currentQueryLinks = await this.clients.assetClient.getAssetLinks(stream, ['query']);
    const nextQueries = currentQueryLinks.filter((link) => link['asset.id'] !== queryId);
    await this.syncQueries(
      stream,
      nextQueries.map((link) => link.query),
      significantEventsEnabled
    );
  }

  public async bulkOperations(
    stream: string,
    operations: Array<{ index?: StreamQuery; delete?: { id: string } }>,
    significantEventsEnabled: boolean
  ) {
    const { assetClient } = this.clients;

    if (!significantEventsEnabled) {
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

    const currentQueryLinks = await this.clients.assetClient.getAssetLinks(stream, ['query']);

    const nextQueries = [
      ...currentQueryLinks
        .filter(
          (link) =>
            !operations.some(
              (operation) => operation.delete && operation.delete.id === link['asset.id']
            )
        )
        .map((link) => {
          const update = operations.find(
            (operation) => operation.index && operation.index.id === link['asset.id']
          );
          return update ? { ...link, query: update.index! } : link;
        }),
      ...operations
        .filter(
          (operation) =>
            operation.index &&
            !currentQueryLinks.some((link) => link['asset.id'] === operation.index!.id)
        )
        .map((operation) => toQueryLink(operation.index!, stream)),
    ];

    await this.syncQueries(
      stream,
      nextQueries.map((link) => link.query),
      significantEventsEnabled
    );
  }

  private async uninstallQueries(queries: QueryLink[]) {
    if (queries.length === 0) {
      return;
    }

    const { rulesClient } = this.clients;
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
