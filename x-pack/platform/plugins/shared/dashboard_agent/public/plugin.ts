/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type {
  DashboardAgentPluginPublicSetup,
  DashboardAgentPluginPublicStart,
  DashboardAgentPluginPublicSetupDependencies,
  DashboardAgentPluginPublicStartDependencies,
} from './types';
import { registerDashboardAttachmentUiDefinition } from './attachment_types';
import { DASHBOARD_SCREENSHOT_APP_ID } from '../common';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginPublicSetup,
      DashboardAgentPluginPublicStart,
      DashboardAgentPluginPublicSetupDependencies,
      DashboardAgentPluginPublicStartDependencies
    >
{
  private cleanupAttachmentUi?: () => void;

  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<DashboardAgentPluginPublicStartDependencies, DashboardAgentPluginPublicStart>,
    _plugins: DashboardAgentPluginPublicSetupDependencies
  ): DashboardAgentPluginPublicSetup {
    core.application.register({
      id: DASHBOARD_SCREENSHOT_APP_ID,
      title: 'Dashboard screenshot',
      visibleIn: [],
      chromeless: true,
      async mount(params) {
        const { renderDashboardScreenshotApp } = await import(
          './screenshot_app/dashboard_screenshot_app'
        );
        const [coreStart, pluginsStart] = await core.getStartServices();

        return renderDashboardScreenshotApp({
          coreStart,
          pluginsStart,
          params,
        });
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: DashboardAgentPluginPublicStartDependencies
  ): DashboardAgentPluginPublicStart {
    this.cleanupAttachmentUi = registerDashboardAttachmentUiDefinition({
      agentBuilder: plugins.agentBuilder,
      chrome: core.chrome,
      canWriteDashboards: core.application.capabilities.dashboard_v2?.showWriteControls === true,
      dashboardLocator: plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR),
      unifiedSearch: plugins.unifiedSearch,
      data: plugins.data,
      dashboardPlugin: plugins.dashboard,
    });

    return {};
  }

  public stop() {
    this.cleanupAttachmentUi?.();
  }
}
