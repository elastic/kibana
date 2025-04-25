/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { getComponentTemplate } from './templates/kb_component_template';
import { resourceNames } from '..';
import { createKnowledgeBaseIndex } from '../knowledge_base_service/create_knowledge_base_index';
import { updateKnowledgeBaseWriteIndexAlias } from '../knowledge_base_service/update_knowledge_base_index_alias';
import { hasKbWriteIndex } from '../knowledge_base_service/has_kb_index';
import { updateKnowledgeBaseIndexMappingFromIndexTemplate } from '../knowledge_base_service/update_knowledge_base_index_mapping';

export async function createOrUpdateKnowledgeBaseIndexAssets({
  logger,
  core,
  inferenceId,
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  inferenceId: string;
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

    // Knowledge base: update write index if index exists
    const indexExists = await hasKbWriteIndex({ esClient: coreStart.elasticsearch.client });
    if (indexExists) {
      logger.debug('Knowledge base index already exists, updating index mapping');
      await updateKnowledgeBaseIndexMappingFromIndexTemplate({
        esClient: coreStart.elasticsearch.client,
        logger,
      });
      return;
    }

    // Knowledge base: create write index
    await createKnowledgeBaseIndex({
      esClient: coreStart.elasticsearch.client,
      logger,
      inferenceId,
      indexName: resourceNames.concreteWriteIndexName.kb,
    });

    await updateKnowledgeBaseWriteIndexAlias({
      esClient: coreStart.elasticsearch.client,
      logger,
      index: resourceNames.concreteWriteIndexName.kb,
    });

    logger.info('Successfully set up knowledge base index assets');
  } catch (error) {
    logger.error(`Failed setting up knowledge base index assets: ${error.message}`);
    logger.debug(error);
  }
}
