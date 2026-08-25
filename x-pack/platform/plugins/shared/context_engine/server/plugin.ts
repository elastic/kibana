/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AiIndexProperties } from '../common/http_api/ai_indices';
import type {
  AiIndexRegistration,
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { AiIndexService } from './ai_indices/service';

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
  private readonly pendingRegistrations: AiIndexRegistration[] = [];

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
      registerAiIndex: (id, properties) => {
        this.pendingRegistrations.push({ id, properties });
      },
    };
  }

  start(coreStart: CoreStart): ContextEnginePluginStart {
    this.aiIndexService = new AiIndexService({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger.get('ai_indices'),
    });

    this.applyPendingRegistrations();

    return {};
  }

  stop() {}

  private applyPendingRegistrations(): void {
    if (!this.aiIndexService || this.pendingRegistrations.length === 0) {
      return;
    }

    const service = this.aiIndexService;
    const log = this.logger.get('ai_index_registrations');

    for (const { id, properties } of this.pendingRegistrations) {
      service
        .put(id, { name: id, ...properties } as AiIndexProperties)
        .then((status) => {
          log.debug(`AI index '${id}' ${status}`);
        })
        .catch((error: unknown) => {
          log.error(
            `Failed to register AI index '${id}': ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        });
    }
  }
}
