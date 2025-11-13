/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { StreamQuery } from '@kbn/streams-schema';
import { buildEsqlQuery } from '@kbn/streams-schema';
import { isEqual, map, partition } from 'lodash';
import pLimit from 'p-limit';
import type { QueryLink } from '../../../../../common/assets';
import type { EsqlRuleParams } from '../../../rules/esql/types';
import type { AssetClient } from '../asset_client';
import { getAssetLinkUuid } from '../asset_client';
import { ASSET_ID, ASSET_TYPE } from '../fields';
import { getRuleIdFromQueryLink } from './helpers/query';

function hasBreakingChange(currentQuery: StreamQuery, nextQuery: StreamQuery): boolean {
  return (
    currentQuery.kql.query !== nextQuery.kql.query ||
    !isEqual(currentQuery.feature, nextQuery.feature)
  );
}

function toQueryLink(query: StreamQuery, stream: string): QueryLink {
  return {
    'asset.uuid': getAssetLinkUuid(stream, { 'asset.type': 'query', 'asset.id': query.id }),
    'asset.type': 'query',
    'asset.id': query.id,
    query,
  };
}

export class QueryClient {
  constructor(
    private readonly dependencies: {
      assetClient: AssetClient;
      rulesClient: RulesClient;
      logger: Logger;
    },
    private readonly isSignificantEventsEnabled: boolean = false
  ) {}

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
    const { [stream]: currentQueryLinks } = await this.dependencies.assetClient.getAssetLinks(
      [stream],
      ['query']
    );
    const currentIds = new Set(currentQueryLinks.map((link) => link.query.id));
    const nextIds = new Set(queries.map((query) => query.id));

    const nextQueriesToCreate = queries
      .filter((query) => !currentIds.has(query.id))
      .map((query) => toQueryLink(query, stream));

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
      (partitionedQueries) => partitionedQueries.map((query) => toQueryLink(query, stream))
    );

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

    const { [stream]: currentQueryLinks } = await this.dependencies.assetClient.getAssetLinks(
      [stream],
      ['query']
    );
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

    const { [stream]: currentQueryLinks } = await this.dependencies.assetClient.getAssetLinks(
      [stream],
      ['query']
    );
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
