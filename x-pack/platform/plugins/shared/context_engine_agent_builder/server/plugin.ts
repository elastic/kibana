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
import { registerContextEngineInferenceFeatures } from './register_inference_features';
import { createProposalsProvider } from './proposals_provider';
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
    registerContextEngineAgentBuilderIntegration({
      coreSetup,
      agentBuilder: setupDeps.agentBuilder,
      workflowsManagement: setupDeps.workflowsManagement.management,
    });

    if (setupDeps.searchInferenceEndpoints) {
      registerContextEngineInferenceFeatures(setupDeps.searchInferenceEndpoints);
    }

    setupDeps.contextEngine.registerWorkflowProvider(
      createWorkflowProvider(setupDeps.workflowsManagement.management)
    );

    // Proposals is optional: it is off by default in serverless, and improvements are then only
    // recorded.
    if (setupDeps.proposals) {
      setupDeps.contextEngine.registerProposalsProvider(
        createProposalsProvider(async () => {
          const [, startDeps] = await coreSetup.getStartServices();
          if (!startDeps.proposals) {
            throw new Error('The proposals plugin is not available');
          }
          return startDeps.proposals;
        })
      );
    }

    return {};
  }

  start(
    _coreStart: CoreStart,
    _startDeps: ContextEngineAgentBuilderStartDependencies
  ): ContextEngineAgentBuilderPluginStart {
    return {};
  }

  stop() {}
}
