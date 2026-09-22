/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerCustomAppSavedObject } from './saved_object/register_custom_app_saved_object';
import { registerRoutes } from './routes';
import { registerAgentBuilderTools } from './agent_builder/register';

export interface CustomAppsSetupDependencies {
  agentBuilder?: AgentBuilderPluginSetup;
}

export class CustomAppsServerPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: CustomAppsSetupDependencies) {
    registerCustomAppSavedObject(core);
    registerRoutes(core);

    // Optional so the plugin still works in a deployment without Agent Builder.
    if (plugins.agentBuilder) {
      registerAgentBuilderTools(plugins.agentBuilder);
    }

    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
