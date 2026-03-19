/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type {
  AlertingAgentBuilderPluginSetup,
  AlertingAgentBuilderPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { registerAlertingTools } from './register_tools';

export class AlertingAgentBuilderPlugin
  implements
    Plugin<
      AlertingAgentBuilderPluginSetup,
      AlertingAgentBuilderPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  setup(
    core: CoreSetup<PluginStartDependencies, AlertingAgentBuilderPluginStart>,
    plugins: PluginSetupDependencies
  ): AlertingAgentBuilderPluginSetup {
    registerAlertingTools({ core, agentBuilder: plugins.agentBuilder });
    return {};
  }

  start(_core: CoreStart, _plugins: PluginStartDependencies): AlertingAgentBuilderPluginStart {
    return {};
  }

  stop() {}
}
