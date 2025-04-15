/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { Logger } from '@kbn/core/server';
import { DEFINITIONS_ALIAS, TEMPLATE_VERSION } from '../constants';
import { InternalClusterClient } from '../types';

const definitionsIndexTemplate = {
  name: `${DEFINITIONS_ALIAS}-template`,
  index_patterns: [`${DEFINITIONS_ALIAS}-*`],
  _meta: {
    description: "Index template for the Elastic Entity Model's entity definitions index.",
    managed: true,
    managed_by: 'elastic_entity_model',
  },
  version: TEMPLATE_VERSION,
  template: {
    settings: {
      hidden: true,
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
    aliases: {
      [DEFINITIONS_ALIAS]: {
        is_hidden: true,
      },
    },
    mappings: {
      dynamic: false,
      properties: {
        template_version: {
          type: 'short' as const,
        },
        definition_type: {
          type: 'keyword' as const,
        },
        source: {
          type: 'object' as const,
          properties: {
            type_id: {
              type: 'keyword' as const,
            },
          },
        },
      },
    },
  },
};

const CURRENT_INDEX = `${DEFINITIONS_ALIAS}-${TEMPLATE_VERSION}` as const;

export async function setupEntityDefinitionsIndex(
  clusterClient: InternalClusterClient,
  logger: Logger
) {
  const esClient = clusterClient.asInternalUser;
  try {
    logger.debug(`Installing entity definitions index template for version ${TEMPLATE_VERSION}`);
    await esClient.indices.putIndexTemplate(definitionsIndexTemplate);

    await esClient.indices.get({
      index: CURRENT_INDEX,
    });

    logger.debug(`Entity definitions index already exists (${CURRENT_INDEX})`);
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      error.message.includes('index_not_found_exception')
    ) {
      logger.debug(`Creating entity definitions index (${CURRENT_INDEX})`);

      await esClient.indices.create({
        index: CURRENT_INDEX,
      });

      return;
    }

    throw error;
  }
}
