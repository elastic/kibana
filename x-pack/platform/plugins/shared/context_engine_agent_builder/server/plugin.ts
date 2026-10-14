/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { createConversationsSpendSource } from './budgets/conversations_spend_source';
import type {
  ContextEngineAgentBuilderPluginSetup,
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderSetupDependencies,
  ContextEngineAgentBuilderStartDependencies,
} from './types';
import { registerContextEngineAgentBuilderIntegration } from './register_agent_builder_integration';
import { registerContextEngineInferenceFeatures } from './register_inference_features';

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
  private esClient?: ElasticsearchClient;

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
      logger: this.logger,
    });

    setupDeps.contextEngine.budgets.registerSpendSource(
      createConversationsSpendSource({
        getEsClient: () => {
          if (!this.esClient) {
            throw new Error('Elasticsearch client is not available before start');
          }
          return this.esClient;
        },
      })
    );

    if (setupDeps.searchInferenceEndpoints) {
      registerContextEngineInferenceFeatures(setupDeps.searchInferenceEndpoints);
    }

    return {};
  }

  start(
    coreStart: CoreStart,
    _startDeps: ContextEngineAgentBuilderStartDependencies
  ): ContextEngineAgentBuilderPluginStart {
    this.esClient = coreStart.elasticsearch.client.asInternalUser;
    return {};
  }

  stop() {}
}
