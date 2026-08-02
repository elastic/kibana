/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import { registerChatCompletionsRoute } from './routes/chat_completions';

/**
 * Minimal server-only plugin. It exposes a single anonymous, OpenAI-compatible
 * chat-completions route used to stand in for a real LLM during QA/load tests.
 */
export class MockLlmPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  /**
   * Registers the mock route on the core HTTP router. No plugin contract is
   * needed, so an empty object is returned.
   */
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    registerChatCompletionsRoute(router, this.logger);
    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
