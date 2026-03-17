/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { KnowledgeMiningConfig } from './config';
import type {
  KnowledgeMiningPluginSetup,
  KnowledgeMiningPluginStart,
  KnowledgeMiningSetupDependencies,
  KnowledgeMiningStartDependencies,
} from './types';
import { MemoryServiceImpl } from './services/memory_service';
import { SuggestionServiceImpl } from './services/suggestion_service';
import { registerRoutes } from './routes';
import { registerTools } from './tools';
import { getAnalyzeSessionStepDefinition } from './step_types/analyze_session_step';

export class KnowledgeMiningPlugin
  implements
    Plugin<
      KnowledgeMiningPluginSetup,
      KnowledgeMiningPluginStart,
      KnowledgeMiningSetupDependencies,
      KnowledgeMiningStartDependencies
    >
{
  private logger: Logger;
  private memoryService?: MemoryServiceImpl;
  private suggestionService?: SuggestionServiceImpl;

  constructor(context: PluginInitializerContext<KnowledgeMiningConfig>) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<KnowledgeMiningStartDependencies, KnowledgeMiningPluginStart>,
    setupDeps: KnowledgeMiningSetupDependencies
  ): KnowledgeMiningPluginSetup {
    this.logger.info('Knowledge Mining plugin setup');

    const getServices = () => {
      if (!this.memoryService || !this.suggestionService) {
        throw new Error('Knowledge Mining services not initialized');
      }
      return {
        memoryService: this.memoryService,
        suggestionService: this.suggestionService,
      };
    };

    const router = coreSetup.http.createRouter();
    registerRoutes({ router, logger: this.logger, getServices });

    registerTools({ agentBuilder: setupDeps.agentBuilder, getServices });

    setupDeps.workflowsExtensions.registerStepDefinition(
      getAnalyzeSessionStepDefinition({ getServices })
    );

    return {};
  }

  start(
    { elasticsearch, security }: CoreStart,
    startDeps: KnowledgeMiningStartDependencies
  ): KnowledgeMiningPluginStart {
    this.memoryService = new MemoryServiceImpl({
      logger: this.logger.get('memory'),
      elasticsearch,
      security,
      spaces: startDeps.spaces,
    });

    this.suggestionService = new SuggestionServiceImpl({
      logger: this.logger.get('suggestions'),
      elasticsearch,
      security,
      spaces: startDeps.spaces,
      memoryService: this.memoryService,
    });

    return {};
  }

  stop() {}
}
