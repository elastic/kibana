/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { conversationComponentTemplate } from './templates/conversation_component_template';
import { resourceNames } from '..';

export async function createOrUpdateConversationIndexAssets({
  logger,
  core,
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}) {
  try {
    logger.debug('Setting up conversation index assets');
    const [coreStart] = await core.getStartServices();
    const { asInternalUser } = coreStart.elasticsearch.client;

    // Conversations: component template
    await asInternalUser.cluster.putComponentTemplate({
      create: false,
      name: resourceNames.componentTemplate.conversations,
      template: conversationComponentTemplate,
    });

    // Conversations: index template
    await asInternalUser.indices.putIndexTemplate({
      name: resourceNames.indexTemplate.conversations,
      composed_of: [resourceNames.componentTemplate.conversations],
      create: false,
      index_patterns: [resourceNames.indexPatterns.conversations],
      template: {
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          hidden: true,
        },
      },
    });

    // Conversations: write index
    const conversationAliasName = resourceNames.writeIndexAlias.conversations;
    await createConcreteWriteIndex({
      esClient: asInternalUser,
      logger,
      totalFieldsLimit: 10000,
      indexPatterns: {
        alias: conversationAliasName,
        pattern: `${conversationAliasName}*`,
        basePattern: `${conversationAliasName}*`,
        name: resourceNames.concreteWriteIndexName.conversations,
        template: resourceNames.indexTemplate.conversations,
      },
      dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
    });

    logger.info('Successfully set up conversation index assets');
  } catch (error) {
    logger.error(`Failed setting up conversation index assets: ${error.message}`);
    logger.debug(error);
  }
}
