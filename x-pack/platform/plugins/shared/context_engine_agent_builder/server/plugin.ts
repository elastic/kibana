/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type {
  ContextEngineAgentBuilderPluginSetup,
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderSetupDependencies,
  ContextEngineAgentBuilderStartDependencies,
} from './types';
import { registerContextEngineAgentBuilderIntegration } from './register_agent_builder_integration';
import { registerContextEngineInferenceFeatures } from './register_inference_features';
import { registerSessionEventsRecorder } from './session_events_recorder/register_session_events_recorder';

export class ContextEngineAgentBuilderPlugin
  implements
    Plugin<
      ContextEngineAgentBuilderPluginSetup,
      ContextEngineAgentBuilderPluginStart,
      ContextEngineAgentBuilderSetupDependencies,
      ContextEngineAgentBuilderStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

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

    registerSessionEventsRecorder({
      agentBuilder: setupDeps.agentBuilder,
      coreSetup,
      logger: this.logger.get('session_events_recorder'),
    });

    if (setupDeps.searchInferenceEndpoints) {
      registerContextEngineInferenceFeatures(setupDeps.searchInferenceEndpoints);
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
