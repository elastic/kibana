/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { getComponentTemplate } from './templates/kb_component_template';
import { resourceNames } from '..';

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

    // Knowledge base: write index
    const kbAliasName = resourceNames.writeIndexAlias.kb;
    await createConcreteWriteIndex({
      esClient: asInternalUser,
      logger,
      totalFieldsLimit: 10000,
      indexPatterns: {
        alias: kbAliasName,
        pattern: `${kbAliasName}*`,
        basePattern: `${kbAliasName}*`,
        name: resourceNames.concreteWriteIndexName.kb,
        template: resourceNames.indexTemplate.kb,
      },
      dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
    });

    logger.info('Successfully set up knowledge base index assets');
  } catch (error) {
    logger.error(`Failed setting up knowledge base index assets: ${error.message}`);
    logger.debug(error);
  }
}
