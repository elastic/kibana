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
  AgentBuilderDashboardsSetupDependencies,
  AgentBuilderDashboardsStartDependencies,
  AgentBuilderDashboardsPluginSetup,
  AgentBuilderDashboardsPluginStart,
} from './types';
import { registerSkills } from './skills';
import {
  createDashboardAttachmentType,
  createDashboardPanelAttachmentType,
} from './attachment_types';
import { createDashboardSmlType } from './sml_types';
import { createDashboardAppStateValidator } from './tools/generate/validate_dashboard_app_state';
import { createPointedPanelTool } from './tools/pointed_panel';

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
    const getDashboardClient = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.dashboard.client;
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
      createDashboardPanelAttachmentType() as Parameters<
        typeof setupDeps.agentBuilder.attachments.registerType
      >[0]
    );
    setupDeps.agentBuilder.tools.register(
      createPointedPanelTool() as Parameters<typeof setupDeps.agentBuilder.tools.register>[0]
    );
    setupDeps.agentBuilderSml.registerType(createDashboardSmlType({ getDashboardClient }));

    registerSkills(setupDeps.agentBuilder, { getDashboardValidator });

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
