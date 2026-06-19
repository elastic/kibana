/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_TRACING_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { syncAgentBuilderOverviewDashboard } from '@kbn/agent-builder-plugin/server';
import { createGenAiSettingsServerRoute } from '../create_gen_ai_settings_server_route';

const installAgentBuilderTracingDashboardRoute = createGenAiSettingsServerRoute({
  endpoint: 'POST /internal/gen_ai_settings/agent_builder/install_tracing_dashboard',
  security: {
    authz: {
      requiredPrivileges: ['manage_advanced_settings'],
    },
  },
  handler: async (resources): Promise<{ installed: boolean }> => {
    const { request, plugins, logger } = resources;

    const coreStart = await plugins.core.start();
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
      coreStart.savedObjects.getScopedClient(request)
    );

    const isEnabled = await uiSettingsClient.get<boolean>(AGENT_BUILDER_TRACING_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return { installed: false };
    }

    await syncAgentBuilderOverviewDashboard(coreStart, true, logger);

    return { installed: true };
  },
});

const uninstallAgentBuilderTracingDashboardRoute = createGenAiSettingsServerRoute({
  endpoint: 'DELETE /internal/gen_ai_settings/agent_builder/tracing_dashboard',
  security: {
    authz: {
      requiredPrivileges: ['manage_advanced_settings'],
    },
  },
  handler: async (resources): Promise<{ uninstalled: boolean }> => {
    const { plugins, logger } = resources;

    const coreStart = await plugins.core.start();

    await syncAgentBuilderOverviewDashboard(coreStart, false, logger);

    return { uninstalled: true };
  },
});

export const agentBuilderTracingDashboardRoutes = {
  ...installAgentBuilderTracingDashboardRoute,
  ...uninstallAgentBuilderTracingDashboardRoute,
};
