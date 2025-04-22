/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import {
  DEFAULT_INFERENCE_ENDPOINT,
  getComponentTemplate,
} from './templates/kb_component_template';
import { resourceNames } from '..';
import { createKnowledgeBaseIndex } from '../knowledge_base_service/create_knowledge_base_index';
import { updateKnowledgeBaseWriteIndexAlias } from '../knowledge_base_service/update_knowledge_base_index_alias';

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

    // Knowledge base: write index
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
