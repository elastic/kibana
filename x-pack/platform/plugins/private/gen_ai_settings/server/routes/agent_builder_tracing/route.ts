/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createGenAiSettingsServerRoute } from '../create_gen_ai_settings_server_route';

const tracingDashboardRoute = createGenAiSettingsServerRoute({
  endpoint: 'POST /internal/gen_ai_settings/agent_builder/tracing_dashboard',
  security: {
    authz: {
      requiredPrivileges: ['manage_advanced_settings'],
    },
  },
  params: z.object({
    body: z.object({ enabled: z.boolean() }),
  }),
  handler: async (resources): Promise<{ success: boolean }> => {
    const { request, params, plugins } = resources;

    if (!plugins.agentBuilderPlatform) {
      return { success: false };
    }

    const agentBuilderPlatformStart = await plugins.agentBuilderPlatform.start();
    await agentBuilderPlatformStart.tracingFeatures.setDashboard({
      enabled: params.body.enabled,
      spaceId: request.spaceId,
    });

    return { success: true };
  },
});

export const agentBuilderTracingRoutes = {
  ...tracingDashboardRoute,
};
