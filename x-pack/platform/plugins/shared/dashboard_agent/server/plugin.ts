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
} from '@kbn/core/server';
import type {
  DashboardAgentSetupDependencies,
  DashboardAgentStartDependencies,
  DashboardAgentPluginSetup,
  DashboardAgentPluginStart,
} from './types';
import { registerSkills } from './skills';
import { createDashboardAttachmentType } from './attachment_types';
import { createDashboardSmlType } from './sml_types';

export class DashboardAgentPlugin
  implements
    Plugin<
      DashboardAgentPluginSetup,
      DashboardAgentPluginStart,
      DashboardAgentSetupDependencies,
      DashboardAgentStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    coreSetup: CoreSetup<DashboardAgentStartDependencies, DashboardAgentPluginStart>,
    setupDeps: DashboardAgentSetupDependencies
  ): DashboardAgentPluginSetup {
    const getDashboardClient = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.dashboard.client;
    };

    setupDeps.agentBuilder.attachments.registerType(
      createDashboardAttachmentType({
        logger: this.logger,
        getDashboardClient,
      }) as Parameters<typeof setupDeps.agentBuilder.attachments.registerType>[0]
    );
    setupDeps.agentBuilder.sml.registerType(createDashboardSmlType({ getDashboardClient }));
    registerSkills(setupDeps.agentBuilder);
    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: DashboardAgentStartDependencies
  ): DashboardAgentPluginStart {
    return {};
  }

  stop() {}
}
