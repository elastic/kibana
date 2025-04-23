/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';

const LOCKS_INDEX_ALIAS = '.kibana_locks';
export const LOCKS_CONCRETE_INDEX_NAME = `${LOCKS_INDEX_ALIAS}-000001`;
export const LOCKS_COMPONENT_TEMPLATE_NAME = `${LOCKS_INDEX_ALIAS}-component`;
export const LOCKS_INDEX_TEMPLATE_NAME = `${LOCKS_INDEX_ALIAS}-index-template`;

export async function removeLockIndexWithIncorrectMappings(
  esClient: ElasticsearchClient,
  logger: Logger
) {
  let res: IndicesGetMappingResponse;
  try {
    res = await esClient.indices.getMapping({ index: LOCKS_CONCRETE_INDEX_NAME });
  } catch (error) {
    const isNotFoundError = error instanceof errors.ResponseError && error.statusCode === 404;
    if (!isNotFoundError) {
      logger.error(
        `Failed to get mapping for lock index "${LOCKS_CONCRETE_INDEX_NAME}": ${error.message}`
      );
    }

    return;
  }

  const { mappings } = res[LOCKS_CONCRETE_INDEX_NAME];
  const hasIncorrectMappings =
    mappings.properties?.token?.type !== 'keyword' ||
    mappings.properties?.expiresAt?.type !== 'date';

  if (hasIncorrectMappings) {
    logger.warn(`Lock index "${LOCKS_CONCRETE_INDEX_NAME}" has incorrect mappings.`);
    try {
      await esClient.indices.delete({ index: LOCKS_CONCRETE_INDEX_NAME });
      logger.info(`Lock index "${LOCKS_CONCRETE_INDEX_NAME}" removed successfully.`);
    } catch (error) {
      logger.error(`Failed to remove lock index "${LOCKS_CONCRETE_INDEX_NAME}": ${error.message}`);
    }
  }
}

export async function ensureTemplatesAndIndexCreated(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  const INDEX_PATTERN = `${LOCKS_INDEX_ALIAS}*`;

  await esClient.cluster.putComponentTemplate({
    name: LOCKS_COMPONENT_TEMPLATE_NAME,
    template: {
      mappings: {
        dynamic: false,
        properties: {
          token: { type: 'keyword' },
          metadata: { enabled: false },
          createdAt: { type: 'date' },
          expiresAt: { type: 'date' },
        },
      },
    },
  });
  logger.info(
    `Component template ${LOCKS_COMPONENT_TEMPLATE_NAME} created or updated successfully.`
  );

  await esClient.indices.putIndexTemplate({
    name: LOCKS_INDEX_TEMPLATE_NAME,
    index_patterns: [INDEX_PATTERN],
    composed_of: [LOCKS_COMPONENT_TEMPLATE_NAME],
    priority: 500,
    template: {
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
        hidden: true,
      },
    },
  });
  logger.info(`Index template ${LOCKS_INDEX_TEMPLATE_NAME} created or updated successfully.`);

  await esClient.indices.create({ index: LOCKS_CONCRETE_INDEX_NAME }, { ignore: [400] });
  logger.info(`Index ${LOCKS_CONCRETE_INDEX_NAME} created or updated successfully.`);
}

export async function setuplockManagerIndex(esClient: ElasticsearchClient, logger: Logger) {
  await removeLockIndexWithIncorrectMappings(esClient, logger); // TODO: should be removed in the future (after 9.1). See https://github.com/elastic/kibana/issues/218944
  await ensureTemplatesAndIndexCreated(esClient, logger);
}
