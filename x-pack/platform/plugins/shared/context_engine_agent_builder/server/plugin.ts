/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type {
  ContextEngineAgentBuilderPluginSetup,
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderSetupDependencies,
  ContextEngineAgentBuilderStartDependencies,
} from './types';
import { registerContextEngineAgentBuilderIntegration } from './register_agent_builder_integration';
import { createWorkflowProvider } from './workflow_provider';

export class ContextEngineAgentBuilderPlugin
  implements
    Plugin<
      ContextEngineAgentBuilderPluginSetup,
      ContextEngineAgentBuilderPluginStart,
      ContextEngineAgentBuilderSetupDependencies,
      ContextEngineAgentBuilderStartDependencies
    >
{
  constructor(_initializerContext: PluginInitializerContext) {}

  setup(
    coreSetup: CoreSetup<
      ContextEngineAgentBuilderStartDependencies,
      ContextEngineAgentBuilderPluginStart
    >,
    setupDeps: ContextEngineAgentBuilderSetupDependencies
  ): ContextEngineAgentBuilderPluginSetup {
    const workflowsManagement = setupDeps.workflowsManagement.management;

    registerContextEngineAgentBuilderIntegration({
      coreSetup,
      agentBuilder: setupDeps.agentBuilder,
      workflowsManagement,
    });

    setupDeps.contextEngine.registerWorkflowProvider(createWorkflowProvider(workflowsManagement));

    return {};
  }

  start(_coreStart: CoreStart): ContextEngineAgentBuilderPluginStart {
    return {};
  }

  stop() {}
}
