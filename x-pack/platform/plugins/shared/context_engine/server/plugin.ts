/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';

export class ContextEnginePlugin
  implements
    Plugin<
      ContextEnginePluginSetup,
      ContextEnginePluginStart,
      ContextEngineSetupDependencies,
      ContextEngineStartDependencies
    >
{
  private logger: Logger;
  private aiIndexService?: AiIndexService;
  private readonly aiIndexRegistry = new AiIndexRegistry();

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });

    const router = coreSetup.http.createRouter();
    registerAiIndexRoutes({
      router,
      getAiIndexService: () => {
        if (!this.aiIndexService) {
          throw new Error('AI index service not available — plugin has not started');
        }
        return this.aiIndexService;
      },
    });

    return {
      registerAiIndex: (id, properties) => this.aiIndexRegistry.register(id, properties),
    };
  }

  async start(coreStart: CoreStart): Promise<ContextEnginePluginStart> {
    this.aiIndexService = new AiIndexService({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger.get('ai_indices'),
    });

    const internalSoClient = coreStart.savedObjects.getUnsafeInternalClient();
    const uiSettings = coreStart.uiSettings.asScopedToClient(internalSoClient);
    const isEnabled = await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);

    await this.aiIndexRegistry.startupRegister({
      aiIndexService: this.aiIndexService,
      isEnabled: isEnabled ?? false,
      logger: this.logger.get('ai_indices'),
    });

    return {};
  }

  stop() {}
}
