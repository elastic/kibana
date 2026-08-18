/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { createSuggestAutomationProvider } from './create_suggest_automation_provider';
import type {
  ContextEngineAgentBuilderPublicSetup,
  ContextEngineAgentBuilderPublicSetupDependencies,
  ContextEngineAgentBuilderPublicStart,
  ContextEngineAgentBuilderPublicStartDependencies,
} from './types';

export class ContextEngineAgentBuilderPlugin
  implements
    Plugin<
      ContextEngineAgentBuilderPublicSetup,
      ContextEngineAgentBuilderPublicStart,
      ContextEngineAgentBuilderPublicSetupDependencies,
      ContextEngineAgentBuilderPublicStartDependencies
    >
{
  constructor(_context: PluginInitializerContext) {}

  setup(
    _core: CoreSetup<
      ContextEngineAgentBuilderPublicStartDependencies,
      ContextEngineAgentBuilderPublicStart
    >
  ): ContextEngineAgentBuilderPublicSetup {
    return {};
  }

  start(
    core: CoreStart,
    { contextEngine, agentBuilder }: ContextEngineAgentBuilderPublicStartDependencies
  ): ContextEngineAgentBuilderPublicStart {
    contextEngine.registerAgentBuilderIntegration({
      suggestAutomation: createSuggestAutomationProvider({
        agentBuilder,
        application: core.application,
      }),
    });

    return {};
  }

  stop() {}
}
