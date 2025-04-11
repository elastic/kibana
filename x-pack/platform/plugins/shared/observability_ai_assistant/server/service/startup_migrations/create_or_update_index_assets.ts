/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConcreteWriteIndex, getDataStreamAdapter } from '@kbn/alerting-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { conversationComponentTemplate } from '../conversation_component_template';
import { DEFAULT_INFERENCE_ENDPOINT, getComponentTemplate } from './kb_component_template';
import { resourceNames } from '..';

export async function updateExistingIndexAssets({
  logger,
  core,
  inferenceId,
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  inferenceId?: string;
}) {
  const [coreStart] = await core.getStartServices();
  const { asInternalUser } = coreStart.elasticsearch.client;

  const hasKbIndex = await asInternalUser.indices.exists({
    index: resourceNames.writeIndexAlias.kb,
  });

  const hasConversationIndex = await asInternalUser.indices.exists({
    index: resourceNames.writeIndexAlias.conversations,
  });

  if (!hasKbIndex && !hasConversationIndex) {
    logger.debug('Index assets do not exist. Aborting updating index assets');
    return;
  }

  await createOrUpdateIndexAssets({ logger, core, inferenceId });
}

export async function createOrUpdateIndexAssets({
  logger,
  core,
  inferenceId = DEFAULT_INFERENCE_ENDPOINT, // TODO: use `.elser-v2-elastic` for serverless on EIS
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  inferenceId?: string;
}) {
  try {
    logger.debug('Setting up index assets');
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

    logger.info('Successfully set up index assets');
  } catch (error) {
    logger.error(`Failed setting up index assets: ${error.message}`);
    logger.debug(error);
  }
}
