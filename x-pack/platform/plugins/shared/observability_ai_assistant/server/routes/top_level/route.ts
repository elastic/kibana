/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createOrUpdateIndexAssets } from '../../service/create_or_update_index_assets';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';

const createOrUpdateIndexAssetsRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/index_assets',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  handler: async (resources): Promise<void> => {
    return createOrUpdateIndexAssets({
      logger: resources.logger,
      core: resources.plugins.core.setup,
    });
  },
});

export const topLevelRoutes = {
  ...createOrUpdateIndexAssetsRoute,
};
