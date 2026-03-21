/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type { EvalsConfig } from './config';
import type {
  EvalsRequestHandlerContext,
  EvalsPluginSetup,
  EvalsPluginStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { DatasetService } from './storage/dataset_service';

export class EvalsPlugin
  implements
    Plugin<EvalsPluginSetup, EvalsPluginStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: EvalsConfig;
  private datasetService?: DatasetService;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    { features, agentBuilder }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return {};
    }

    this.logger.info('Setting up Evals plugin');
    this.datasetService = new DatasetService(this.logger);

    coreSetup.http.registerRouteHandlerContext<EvalsRequestHandlerContext, 'evals'>(
      'evals',
      async (context) => {
        if (!this.datasetService) {
          throw new Error('DatasetService has not been initialized');
        }

        return {
          datasetService: this.datasetService,
        };
      }
    );

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      order: 9000,
      category: DEFAULT_APP_CATEGORIES.management,
      app: ['kibana', PLUGIN_ID],
      management: { ai: [PLUGIN_ID] },
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          management: { ai: [PLUGIN_ID] },
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
        read: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          management: { ai: [PLUGIN_ID] },
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
      },
    });

    const router = coreSetup.http.createRouter<EvalsRequestHandlerContext>();
    registerRoutes({ router, logger: this.logger });

    // AESOP: Auto-create custom Agent Builder agents on plugin start
    if (agentBuilder) {
      coreSetup.getStartServices().then(async ([coreStart, pluginsStart]) => {
        try {
          const { createAESOPAgents } = await import('./lib/aesop/agents/create_aesop_agents');
          // Note: createAESOPAgents needs to be adapted to work with plugin setup context
          this.logger.info('[AESOP] Custom agents will be created on first exploration run');
        } catch (error) {
          this.logger.warn('[AESOP] Could not load AESOP agents module', { error });
        }
      });
    }

    return {};
  }

  start(_core: CoreStart, _plugins: EvalsStartDependencies): EvalsPluginStart {
    return {
      datasetService: this.datasetService,
    };
  }

  stop() {}
}
