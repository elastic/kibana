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
import { registerAutomationTemplateRoutes } from './routes/automation_templates';

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

    registerAutomationTemplateRoutes({
      router: coreSetup.http.createRouter(),
      logger: this.logger.get('automation_templates'),
      getSpaceId: async (request) => {
        const [, { spaces }] = await coreSetup.getStartServices();
        return spaces?.spacesService.getSpaceId(request) ?? 'default';
      },
      getAiIndexService: async () => {
        const [, { contextEngine }] = await coreSetup.getStartServices();
        return contextEngine.getAiIndexService();
      },
      getCoreStart: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        return coreStart;
      },
      getSecurityStart: async () => {
        const [, { security }] = await coreSetup.getStartServices();
        return security;
      },
      getWorkflowsManagement: () => setupDeps.workflowsManagement.management,
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
