/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import {
  DEFAULT_INFERENCE_ENDPOINT,
  getComponentTemplate,
} from './templates/kb_component_template';
import { resourceNames } from '..';
import { createKnowledgeBaseIndex } from '../knowledge_base_service/create_knowledge_base_index';
import { updateKnowledgeBaseWriteIndexAlias } from '../knowledge_base_service/update_knowledge_base_index_alias';
import { hasKbIndex } from '../knowledge_base_service/has_kb_index';

export async function createOrUpdateKnowledgeBaseIndexAssets({
  logger,
  core,
  inferenceId = DEFAULT_INFERENCE_ENDPOINT, // TODO: use `.elser-v2-elastic` for serverless on EIS
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  inferenceId?: string;
}) {
  try {
    logger.debug('Setting up knowledge base index assets');
    const [coreStart] = await core.getStartServices();
    const { asInternalUser } = coreStart.elasticsearch.client;

    // Knowledge base: component template
    await asInternalUser.cluster.putComponentTemplate({
      create: false,
      name: resourceNames.componentTemplate.kb,
      template: getComponentTemplate(inferenceId),
    });

    // Knowledge base: index template
    await asInternalUser.indices.putIndexTemplate({
      name: resourceNames.indexTemplate.kb,
      composed_of: [resourceNames.componentTemplate.kb],
      create: false,
      index_patterns: [resourceNames.indexPatterns.kb],
      template: {
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          hidden: true,
        },
      },
    });

    const name = resourceNames.concreteWriteIndexName.kb;
    const alias = resourceNames.writeIndexAlias.kb;

    const indexExists = await hasKbIndex({ esClient: coreStart.elasticsearch.client });

    if (indexExists) {
      const aliasInfo = await asInternalUser.indices.getAlias({
        name: alias,
        ignore_unavailable: true,
      });

      const isWriteIndex = Object.entries(aliasInfo).some(
        ([_indexName, aliasData]) => aliasData.aliases?.[alias]?.is_write_index
      );

      if (isWriteIndex) {
        logger.info(
          `Knowledge base write index [${name}] already exists and is assigned as a write index. Skipping creation.`
        );

        const resolved = await asInternalUser.indices.simulateTemplate({
          name: resourceNames.indexTemplate.kb,
        });

        const resolvedProperties = resolved.template?.mappings?.properties;

        if (resolvedProperties) {
          await asInternalUser.indices.putMapping({
            index: name,
            properties: resolvedProperties,
          });
          logger.info(
            `Updated mappings for index [${name}] from template [${resourceNames.indexTemplate.kb}].`
          );
        } else {
          logger.warn(
            `No mappings found in index template [${resourceNames.indexTemplate.kb}], skipping mapping update.`
          );
        }
      }

      return;
    }

    // Knowledge base: write index
    await createKnowledgeBaseIndex({
      esClient: coreStart.elasticsearch.client,
      logger,
      inferenceId,
      indexName: name,
    });

    await updateKnowledgeBaseWriteIndexAlias({
      esClient: coreStart.elasticsearch.client,
      logger,
      index: name,
    });

    logger.info('Successfully set up knowledge base index assets');
  } catch (error) {
    logger.error(`Failed setting up knowledge base index assets: ${error.message}`);
    logger.debug(error);
  }
}
