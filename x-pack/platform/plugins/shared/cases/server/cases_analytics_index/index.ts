/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping, StoredScript } from '@elastic/elasticsearch/lib/api/types';
import {
  CAI_CASES_INDEX_NAME,
  CAI_ATTACHMENTS_INDEX_NAME,
  CAI_COMMENTS_INDEX_NAME,
  CAI_DEFAULT_TIMEOUT,
  CAI_NUMBER_OF_SHARDS,
  CAI_AUTO_EXPAND_REPLICAS,
  CAI_INDEX_MODE,
  CAI_REFRESH_INTERVAL,
} from './constants';
import {
  CAI_CASES_INDEX_MAPPINGS,
  CAI_ATTACHMENTS_INDEX_MAPPINGS,
  CAI_COMMENTS_INDEX_MAPPINGS,
} from './mappings';
import {
  CAI_ATTACHMENTS_INDEX_SCRIPT,
  CAI_ATTACHMENTS_INDEX_SCRIPT_ID,
  CAI_CASES_INDEX_SCRIPT,
  CAI_CASES_INDEX_SCRIPT_ID,
  CAI_COMMENTS_INDEX_SCRIPT,
  CAI_COMMENTS_INDEX_SCRIPT_ID,
} from './painless_scripts';

export const createCasesAnalyticsIndices = async ({
  esClient,
  logger,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
}) => {
  logger.debug('initializing factory');

  return Promise.all([
    createIndex({
      esClient,
      logger,
      isServerless,
      indexName: CAI_CASES_INDEX_NAME,
      mappings: CAI_CASES_INDEX_MAPPINGS,
      painlessScript: CAI_CASES_INDEX_SCRIPT,
      painlessScriptId: CAI_CASES_INDEX_SCRIPT_ID,
    }),
    createIndex({
      esClient,
      logger,
      isServerless,
      indexName: CAI_ATTACHMENTS_INDEX_NAME,
      mappings: CAI_ATTACHMENTS_INDEX_MAPPINGS,
      painlessScript: CAI_ATTACHMENTS_INDEX_SCRIPT,
      painlessScriptId: CAI_ATTACHMENTS_INDEX_SCRIPT_ID,
    }),
    createIndex({
      esClient,
      logger,
      isServerless,
      indexName: CAI_COMMENTS_INDEX_NAME,
      mappings: CAI_COMMENTS_INDEX_MAPPINGS,
      painlessScript: CAI_COMMENTS_INDEX_SCRIPT,
      painlessScriptId: CAI_COMMENTS_INDEX_SCRIPT_ID,
    }),
  ]);
};

const createIndex = async ({
  esClient,
  logger,
  isServerless,
  indexName,
  mappings,
  painlessScript,
  painlessScriptId,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  logger: Logger;
  isServerless: boolean;
  painlessScript: StoredScript;
  painlessScriptId: string;
}) => {
  const indexSettings = {
    // settings are not supported on serverless ES
    ...(isServerless
      ? {}
      : {
          number_of_shards: CAI_NUMBER_OF_SHARDS,
          auto_expand_replicas: CAI_AUTO_EXPAND_REPLICAS,
          refresh_interval: CAI_REFRESH_INTERVAL,
          'index.mode': CAI_INDEX_MODE,
        }),
  };

  try {
    logger.info(`Checking if ${indexName} exists.`);
    const isLatestIndexExists = await esClient.indices.exists({
      index: indexName,
    });

    if (!isLatestIndexExists) {
      logger.info(`Creating ${indexName} painless script.`);
      await esClient.putScript({
        id: painlessScriptId,
        script: painlessScript,
      });

      logger.info(`Creating ${indexName} index.`);
      await esClient.indices.create({
        index: indexName,
        timeout: CAI_DEFAULT_TIMEOUT,
        mappings, // do we want to pass the script id?
        settings: {
          index: indexSettings,
        },
      });

      scheduleBackfillTask();
    } else {
      logger.info(`${indexName} index exists. Skipping creation.`);
      const currentMapping = await esClient.indices.getMapping({
        index: indexName,
      });

      console.log(JSON.stringify(currentMapping, null, 4));

      logger.info('Comparing mapping versions.');
      if (
        currentMapping[indexName].mappings._meta?.mapping_version < mappings._meta?.mapping_version
      ) {
        logger.info(`Old version detected. Updating ${indexName} mapping.`);
        logger.info(`Updating ${indexName} painless script.`);
        // create painless script
        await esClient.putScript({
          id: painlessScriptId,
          script: painlessScript,
        });

        logger.info(`Updating ${indexName} mapping.`);
        await esClient.indices.putMapping({
          index: indexName,
          ...mappings,
        });

        scheduleBackfillTask();
      } else {
        logger.info(`${indexName} mapping version is up to date. Skipping mapping update.`);
        logger.debug(`${indexName} mapping version is up to date. Skipping mapping update.`);
      }
    }
  } catch (err) {
    logger.error(`Failed to create the index template: ${indexName}`);
    logger.error(err.message);
  }
};

const scheduleBackfillTask = () => {};
