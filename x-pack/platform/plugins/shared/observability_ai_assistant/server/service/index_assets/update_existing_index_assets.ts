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
import { hasKbWriteIndex } from '../knowledge_base_service/has_kb_index';
import { getInferenceIdFromWriteIndex } from '../knowledge_base_service/get_inference_id_from_write_index';
import { resourceNames } from '..';

export const DEFAULT_INFERENCE_ENDPOINT = '.elser-2-elasticsearch';

export async function updateExistingIndexAssets({
  logger,
  core,
}: {
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}) {
  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client;

  const doesKbIndexExist = await hasKbWriteIndex({ esClient });

  const doesConversationIndexExist = await esClient.asInternalUser.indices.exists({
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

    const currentInferenceId = await getInferenceIdFromWriteIndex(esClient).catch(() => {
      logger.debug(
        `Current KB write index does not have an inference_id. This is to be expected for indices created before 8.16`
      );
      return DEFAULT_INFERENCE_ENDPOINT;
    });

    await createOrUpdateKnowledgeBaseIndexAssets({ logger, core, inferenceId: currentInferenceId });
  }
}
