/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { LlmGatewayConfig } from './config';
import type {
  LlmGatewayPluginSetup,
  LlmGatewayPluginStart,
  LlmGatewaySetupDependencies,
  LlmGatewayStartDependencies,
} from './types';
import { registerRoutes } from './routes';

export class LlmGatewayPlugin
  implements
    Plugin<
      LlmGatewayPluginSetup,
      LlmGatewayPluginStart,
      LlmGatewaySetupDependencies,
      LlmGatewayStartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext<LlmGatewayConfig>) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<LlmGatewayStartDependencies, LlmGatewayPluginStart>,
    setupDeps: LlmGatewaySetupDependencies
  ): LlmGatewayPluginSetup {
    this.logger.info('LLM Gateway plugin is setting up');

    setupDeps.agentBuilder.agents.register({
      id: 'platform.llm_gateway.agent',
      name: 'LLM Gateway',
      description: 'Conversations from external coding agents via the LLM Gateway',
      avatar_icon: 'sparkles',
      configuration: {
        instructions: '',
        tools: [],
      },
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
    });

    return {};
  }

  start(_core: CoreStart, _startDeps: LlmGatewayStartDependencies): LlmGatewayPluginStart {
    return {};
  }

  stop() {}
}
