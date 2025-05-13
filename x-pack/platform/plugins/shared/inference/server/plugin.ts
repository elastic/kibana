/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  createClient as createInferenceClient,
  createChatModel,
  type BoundInferenceClient,
  type InferenceClient,
} from './inference_client';
import { registerRoutes } from './routes';
import type { InferenceConfig } from './config';
import {
  InferenceBoundClientCreateOptions,
  InferenceClientCreateOptions,
  InferenceServerSetup,
  InferenceServerStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
} from './types';
import { initLangfuseProcessor } from './tracing/langfuse/init_langfuse_processor';
import { initPhoenixProcessor } from './tracing/phoenix/init_phoenix_processor';

export class InferencePlugin
  implements
    Plugin<
      InferenceServerSetup,
      InferenceServerStart,
      InferenceSetupDependencies,
      InferenceStartDependencies
    >
{
  private logger: Logger;

  private config: InferenceConfig;

  private shutdownProcessor?: () => Promise<void>;

  constructor(context: PluginInitializerContext<InferenceConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();

    const exporter = this.config.tracing?.exporter;

    if (exporter && 'langfuse' in exporter) {
      this.shutdownProcessor = initLangfuseProcessor({
        logger: this.logger,
        config: exporter.langfuse,
      });
    } else if (exporter && 'phoenix' in exporter) {
      this.shutdownProcessor = initPhoenixProcessor({
        logger: this.logger,
        config: exporter.phoenix,
      });
    }
  }
  setup(
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>,
    pluginsSetup: InferenceSetupDependencies
  ): InferenceServerSetup {
    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      coreSetup,
      logger: this.logger,
    });

    return {};
  }

  start(core: CoreStart, pluginsStart: InferenceStartDependencies): InferenceServerStart {
    return {
      getClient: <T extends InferenceClientCreateOptions>(options: T) => {
        return createInferenceClient({
          ...options,
          actions: pluginsStart.actions,
          logger: this.logger.get('client'),
        }) as T extends InferenceBoundClientCreateOptions ? BoundInferenceClient : InferenceClient;
      },

      getChatModel: async (options) => {
        return createChatModel({
          request: options.request,
          connectorId: options.connectorId,
          chatModelOptions: options.chatModelOptions,
          actions: pluginsStart.actions,
          logger: this.logger,
        });
      },
    };
  }

  async stop() {
    await this.shutdownProcessor?.();
  }
}
