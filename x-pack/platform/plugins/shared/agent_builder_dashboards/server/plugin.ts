/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { resolveCompileAllowList, type AgentBuilderDashboardsConfig } from './config';
import type {
  AgentBuilderDashboardsSetupDependencies,
  AgentBuilderDashboardsStartDependencies,
  AgentBuilderDashboardsPluginSetup,
  AgentBuilderDashboardsPluginStart,
} from './types';
import { registerSkills } from './skills';
import { createDashboardAttachmentType } from './attachment_types';
import { createDashboardSmlType } from './sml_types';

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
  private readonly compileAllowList: SupportedChartType[];

  constructor(initializerContext: PluginInitializerContext<AgentBuilderDashboardsConfig>) {
    this.logger = initializerContext.logger.get();
    let rawConfig: unknown = {};
    try {
      rawConfig = initializerContext.config.get();
    } catch {
      rawConfig = {};
    }
    this.compileAllowList = resolveCompileAllowList(rawConfig);
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

    setupDeps.agentBuilder.attachments.registerType(
      createDashboardAttachmentType({
        logger: this.logger,
        getDashboardClient,
      }) as Parameters<typeof setupDeps.agentBuilder.attachments.registerType>[0]
    );
    setupDeps.agentBuilderSml.registerType(createDashboardSmlType({ getDashboardClient }));

    registerSkills(setupDeps.agentBuilder, { compileAllowList: this.compileAllowList });

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
