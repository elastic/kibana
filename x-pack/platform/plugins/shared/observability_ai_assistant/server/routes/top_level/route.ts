/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { createOrUpdateConversationIndexAssets } from '../../service/index_assets/create_or_update_conversation_index_assets';
import { createOrUpdateKnowledgeBaseIndexAssets } from '../../service/index_assets/create_or_update_knowledge_base_index_assets';

const createOrUpdateIndexAssetsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/index_assets',
  params: t.type({
    query: t.type({
      inference_id: t.string,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    const { inference_id: inferenceId } = resources.params.query;

    await createOrUpdateConversationIndexAssets({
      logger: resources.logger,
      core: resources.plugins.core.setup,
    });

    return createOrUpdateKnowledgeBaseIndexAssets({
      logger: resources.logger,
      core: resources.plugins.core.setup,
      inferenceId,
    });
  },
});

export const topLevelRoutes = {
  ...createOrUpdateIndexAssetsRoute,
};
