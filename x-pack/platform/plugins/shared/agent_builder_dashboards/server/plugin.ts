/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type {
  AgentBuilderDashboardsSetupDependencies,
  AgentBuilderDashboardsStartDependencies,
  AgentBuilderDashboardsPluginSetup,
  AgentBuilderDashboardsPluginStart,
} from './types';
import { registerSkills } from './skills';
import {
  createDashboardAttachmentType,
  createPanelPreviewAttachmentType,
} from './attachment_types';
import { createDashboardSmlType } from './sml_types';
import { createDashboardAppStateValidator } from './tools/generate/validate_dashboard_app_state';

export class AgentBuilderDashboardsPlugin
  implements
    Plugin<
      AgentBuilderDashboardsPluginSetup,
      AgentBuilderDashboardsPluginStart,
      AgentBuilderDashboardsSetupDependencies,
      AgentBuilderDashboardsStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    coreSetup: CoreSetup<
      AgentBuilderDashboardsStartDependencies,
      AgentBuilderDashboardsPluginStart
    >,
    setupDeps: AgentBuilderDashboardsSetupDependencies
  ): AgentBuilderDashboardsPluginSetup {
    // Read dashboards the way the Dashboard app loads them, so unconvertible panels are kept.
    const getDashboardClient = async (): Promise<DashboardPluginStart['client']> => {
      const [, { dashboard }] = await coreSetup.getStartServices();
      return {
        read: (savedObjectsClient, id) =>
          dashboard.client.read(savedObjectsClient, id, { isDashboardAppRequest: true }),
      };
    };
    const getDashboardValidator = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return createDashboardAppStateValidator(startDeps.embeddable);
    };

    setupDeps.agentBuilder.attachments.registerType(
      createDashboardAttachmentType({
        logger: this.logger,
        getDashboardClient,
      }) as Parameters<typeof setupDeps.agentBuilder.attachments.registerType>[0]
    );
    setupDeps.agentBuilder.attachments.registerType(
      createPanelPreviewAttachmentType() as Parameters<
        typeof setupDeps.agentBuilder.attachments.registerType
      >[0]
    );
    setupDeps.agentBuilderSml.registerType(createDashboardSmlType({ getDashboardClient }));

    const emsSettings = setupDeps.mapsEms?.createEMSSettings();
    const ems = emsSettings && {
      isEnabled: emsSettings.isEMSEnabled(),
      fileApiUrl: emsSettings.getEMSFileApiUrl(),
      tileApiUrl: emsSettings.getEMSTileApiUrl(),
      landingPageUrl: emsSettings.getEMSLandingPageUrl(),
    };
    const getPreviewSettings = async (savedObjectsClient: SavedObjectsClientContract) => {
      const [coreStart] = await coreSetup.getStartServices();
      const uiSettings = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
      const [timeZone, dateFormat] = await Promise.all([
        uiSettings.get<string>('dateFormat:tz'),
        uiSettings.get<string>('dateFormat'),
      ]);
      return { timeZone, dateFormat, ems };
    };

    registerSkills(setupDeps.agentBuilder, { getDashboardValidator, getPreviewSettings });

    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: AgentBuilderDashboardsStartDependencies
  ): AgentBuilderDashboardsPluginStart {
    return {};
  }

  stop() {}
}
