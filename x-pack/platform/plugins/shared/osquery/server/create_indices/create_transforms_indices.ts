/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { actionsMapping } from './actions_mapping';
import { actionResponsesMapping } from './action_responses_mapping';

export const ACTIONS_INDEX_NAME = 'osquery_manager.actions';
export const ACTIONS_INDEX_DEFAULT_NS = '.logs-' + ACTIONS_INDEX_NAME + '-default';

export const ACTION_RESPONSES_INDEX_NAME = 'osquery_manager.action.responses';
export const ACTION_RESPONSES_INDEX_DEFAULT_NS =
  '.logs-' + ACTION_RESPONSES_INDEX_NAME + '-default';

export const initializeTransformsIndices = async (esClient: ElasticsearchClient, logger: Logger) =>
  Promise.all([
    createIndexIfNotExists(
      esClient,
      ACTIONS_INDEX_NAME,
      ACTIONS_INDEX_DEFAULT_NS,
      actionsMapping,
      logger
    ),
    createIndexIfNotExists(
      esClient,
      ACTION_RESPONSES_INDEX_NAME,
      ACTION_RESPONSES_INDEX_DEFAULT_NS,
      actionResponsesMapping,
      logger
    ),
  ]);

export const createIndexIfNotExists = async (
  esClient: ElasticsearchClient,
  indexTemplateName: string,
  indexPattern: string,
  mappings: MappingTypeMapping,
  logger: Logger
) => {
  try {
    const isLatestIndexExists = await esClient.indices.exists({
      index: indexPattern,
    });

    if (!isLatestIndexExists) {
      await esClient.indices.putIndexTemplate({
        name: indexTemplateName,
        index_patterns: indexPattern,
        template: { mappings },
        priority: 500,
      });
      await esClient.indices.create({
        index: indexPattern,
        mappings,
      });
    }
  } catch (err) {
    const error = transformError(err);
    logger.error(`Failed to create the index template: ${indexTemplateName}`);
    logger.error(error.message);
  }
};
