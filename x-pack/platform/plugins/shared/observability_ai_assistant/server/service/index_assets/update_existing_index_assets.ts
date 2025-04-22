/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { createOrUpdateConversationIndexAssets } from './create_or_update_conversation_index_assets';
import { createOrUpdateKnowledgeBaseIndexAssets } from './create_or_update_knowledge_base_index_assets';
import { resourceNames } from '..';
import { hasKbIndex } from '../knowledge_base_service/has_kb_index';

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

  const doesKbIndexExist = await hasKbIndex({ esClient: coreStart.elasticsearch.client });

  const doesConversationIndexExist = await asInternalUser.indices.exists({
    index: resourceNames.writeIndexAlias.conversations,
  });

  if (!doesKbIndexExist && !doesConversationIndexExist) {
    logger.warn('Index assets do not exist. Aborting updating index assets');
    return;
  }

  if (doesConversationIndexExist) {
    logger.debug('Found index for conversations. Updating index assets.');
    await createOrUpdateConversationIndexAssets({ logger, core });
  }

  if (doesKbIndexExist) {
    logger.debug('Found index for knowledge base. Updating index assets.');
    await createOrUpdateKnowledgeBaseIndexAssets({ logger, core, inferenceId });
  }
}
