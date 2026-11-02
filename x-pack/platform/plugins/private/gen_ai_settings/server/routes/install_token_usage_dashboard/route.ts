/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { createGenAiSettingsServerRoute } from '../create_gen_ai_settings_server_route';

const installTokenUsageDashboardRoute = createGenAiSettingsServerRoute({
  endpoint: 'POST /internal/gen_ai_settings/install_token_usage_dashboard',
  security: {
    authz: {
      requiredPrivileges: ['manage_advanced_settings'],
    },
  },
  handler: async (resources): Promise<{ installed: boolean }> => {
    const { request, plugins } = resources;

    const coreStart = await plugins.core.start();
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
      coreStart.savedObjects.getScopedClient(request)
    );

    const isEnabled = await uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING);
    if (!isEnabled) {
      return { installed: false };
    }

    const inferenceStart = await plugins.inference.start();
    await inferenceStart.installTokenUsageDashboard();

    return { installed: true };
  },
});

export const installTokenUsageDashboardRoutes = {
  ...installTokenUsageDashboardRoute,
};
