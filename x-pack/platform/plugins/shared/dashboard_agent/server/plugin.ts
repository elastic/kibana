/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerSkills } from './skills';
import { createDashboardAttachmentType } from './attachment_types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    this.logger.debug('Setting up Dashboard skills and tools');
    this.registerToolsAndSkills(coreSetup, setupDeps).catch((error) => {
      this.logger.error(`Error registering dashboard skill and tools: ${error}`);
    });

    return {};
  }

  private async registerToolsAndSkills(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ) {
    const [coreStart] = await coreSetup.getStartServices();
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
      coreStart.savedObjects.getUnsafeInternalClient()
    );
    const experimentalFeaturesEnabled = await uiSettingsClient.get<boolean>(
      AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
    );

    if (!experimentalFeaturesEnabled) {
      this.logger.debug(
        `Skipping dashboard skill and tools registration because ui setting "${AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID}" is set to false`
      );
      return;
    }

    // Register the dashboard attachment type
    setupDeps.agentBuilder.attachments.registerType(createDashboardAttachmentType() as any);

    // Register dashboard skills for the default agent.
    await registerSkills(setupDeps.agentBuilder);
  }

  start(
    _coreStart: CoreStart,
    _startDeps: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
