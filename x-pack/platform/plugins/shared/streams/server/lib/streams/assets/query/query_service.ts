/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import { buildEsqlWhereCondition } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../../../types';
import { createFakeRequestBoundToDefaultSpace } from '../../helpers/fake_request_factory';
import { QUERY_ESQL_WHERE, QUERY_KQL_BODY, QUERY_FEATURE_FILTER } from '../fields';
import { queryStorageSettings, type QueryStorageSettings } from '../storage_settings';
import { QueryClient, type StoredQueryLink } from './query_client';

const MIGRATION_BATCH_SIZE = 1000;

export class QueryService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({ request }: { request: KibanaRequest }): Promise<QueryClient> {
    const [core, pluginStart] = await this.coreSetup.getStartServices();

    const soClient = core.savedObjects.getScopedClient(request);
    const uiSettings = core.uiSettings.asScopedToClient(soClient);
    const isSignificantEventsEnabled =
      (await uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)) ?? false;

    const rulesClientRequest =
      !pluginStart.spaces ||
      pluginStart.spaces.spacesService.getSpaceId(request) === DEFAULT_SPACE_ID
        ? request
        : createFakeRequestBoundToDefaultSpace(request);
    const rulesClient = await pluginStart.alerting.getRulesClientWithRequest(rulesClientRequest);

    const adapter = new StorageIndexAdapter<QueryStorageSettings, StoredQueryLink>(
      core.elasticsearch.client.asInternalUser,
      this.logger.get('queries'),
      queryStorageSettings
    );

    return new QueryClient(
      {
        storageClient: adapter.getClient(),
        soClient,
        rulesClient,
        logger: this.logger,
      },
      isSignificantEventsEnabled
    );
  }

  /**
   * Migrates existing queries to include the esql.where field.
   * This runs at startup and updates all documents that don't have esql.where populated.
   * The migration processes documents in batches and continues until all documents are migrated.
   */
  async migrateQueriesToEsqlWhere(esClient: ElasticsearchClient): Promise<void> {
    const logger = this.logger.get('esql-where-migration');
    const indexName = queryStorageSettings.name;

    try {
      if (!(await esClient.indices.exists({ index: indexName }))) {
        logger.debug('Index does not exist, skipping migration');
        return;
      }

      await this.ensureEsqlWhereMappingExists({ esClient, indexName, logger });
      await this.migrateQueriesInBatches({ esClient, indexName, logger });
    } catch (error) {
      logger.error(`Migration failed: ${error}`);
      throw error;
    }
  }

  private async ensureEsqlWhereMappingExists({
    esClient,
    indexName,
    logger,
  }: {
    esClient: ElasticsearchClient;
    indexName: string;
    logger: Logger;
  }): Promise<void> {
    const mappingResponse = await esClient.indices.getMapping({ index: indexName });
    const indexMapping = Object.values(mappingResponse)[0]?.mappings;
    const queryProperties = (indexMapping?.properties?.query as { properties?: unknown })
      ?.properties as Record<string, unknown> | undefined;
    const hasEsqlWhereField = !!queryProperties?.esql;

    if (hasEsqlWhereField) {
      logger.debug('esql.where mapping already exists');
      return;
    }

    await esClient.indices.putMapping({
      index: indexName,
      properties: {
        query: {
          properties: {
            esql: {
              properties: {
                where: { type: 'match_only_text' },
              },
            },
          },
        },
      },
    });

    logger.info('Added esql.where field to index mapping');
  }

  private async migrateQueriesInBatches({
    esClient,
    indexName,
    logger,
  }: {
    esClient: ElasticsearchClient;
    indexName: string;
    logger: Logger;
  }): Promise<void> {
    let totalMigrated = 0;
    let batchNumber = 0;
    let batch: Array<SearchHit<StoredQueryLink>>;

    do {
      batchNumber++;
      const response = await esClient.search<StoredQueryLink>({
        index: indexName,
        size: MIGRATION_BATCH_SIZE,
        query: {
          bool: {
            must_not: [{ exists: { field: QUERY_ESQL_WHERE } }],
          },
        },
      });
      batch = response.hits.hits;

      if (batch.length === 0) {
        if (totalMigrated === 0) {
          logger.debug('No queries need migration');
        } else {
          logger.info(`Migration complete. Total queries migrated: ${totalMigrated}`);
        }
        return;
      }

      logger.info(`Processing batch ${batchNumber}: ${batch.length} queries`);

      const migratedCount = await this.bulkAddEsqlWhere({
        esClient,
        indexName,
        hits: batch,
        logger,
      });
      totalMigrated += migratedCount;

      logger.info(
        `Batch ${batchNumber} complete. Migrated: ${migratedCount}, Total: ${totalMigrated}`
      );
    } while (batch.length === MIGRATION_BATCH_SIZE);

    logger.info(`Migration complete. Total queries migrated: ${totalMigrated}`);
  }

  private async bulkAddEsqlWhere({
    esClient,
    indexName,
    hits,
    logger,
  }: {
    esClient: ElasticsearchClient;
    indexName: string;
    hits: Array<SearchHit<StoredQueryLink>>;
    logger: Logger;
  }): Promise<number> {
    const bulkOperations = hits.flatMap((hit) => {
      const source = hit._source;
      if (!source || !hit._id) {
        return [];
      }
      const kqlQuery = source[QUERY_KQL_BODY];
      const featureFilterJson = (source as Record<string, unknown>)[QUERY_FEATURE_FILTER];
      const featureFilter =
        featureFilterJson && typeof featureFilterJson === 'string' && featureFilterJson !== ''
          ? JSON.parse(featureFilterJson)
          : undefined;

      const esqlWhere = buildEsqlWhereCondition({
        kql: { query: kqlQuery },
        feature: featureFilter
          ? {
              name: '',
              filter: featureFilter,
              type: 'system',
            }
          : undefined,
      });

      return [
        { update: { _index: indexName, _id: hit._id } },
        { doc: { [QUERY_ESQL_WHERE]: esqlWhere } },
      ];
    });

    if (bulkOperations.length === 0) {
      return 0;
    }

    const bulkResponse = await esClient.bulk({ operations: bulkOperations, refresh: true });

    if (bulkResponse.errors) {
      const failedItems = bulkResponse.items.filter((item) => item.update?.error);
      logger.error(
        `Failed to migrate ${failedItems.length} queries: ${JSON.stringify(failedItems)}`
      );
      return hits.length - failedItems.length;
    }

    return hits.length;
  }
}
