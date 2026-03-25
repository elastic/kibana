/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
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
import { registerAESOPRoutes } from './routes/aesop/register_aesop_routes';
import { DatasetService } from './storage/dataset_service';
import { ensureAesopILMPolicy } from './lib/aesop/storage/index_lifecycle';

export class EvalsPlugin
  implements
    Plugin<EvalsPluginSetup, EvalsPluginStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: EvalsConfig;
  private datasetService?: DatasetService;
  private actionsStart?: EvalsStartDependencies['actions'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agentBuilderStart?: any;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    { features, workflows }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return {};
    }

    this.logger.info('Setting up Evals plugin');
    this.datasetService = new DatasetService(this.logger);

    coreSetup.http.registerRouteHandlerContext<EvalsRequestHandlerContext, 'evals'>(
      'evals',
      async () => {
        if (!this.datasetService) {
          throw new Error('DatasetService has not been initialized');
        }

        return {
          datasetService: this.datasetService,
          getActionsStart: () => this.actionsStart,
          getAgentBuilderStart: () => this.agentBuilderStart,
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

    // ═══════════════════════════════════════════════════════════════
    // AESOP Integration (Agent-driven Exploration for Security Ops)
    // ═══════════════════════════════════════════════════════════════
    this.logger.info('Registering AESOP routes for self-directed skill acquisition');
    registerAESOPRoutes({ router, logger: this.logger });

    // Register AESOP workflows (if Workflows plugin available)
    if (workflows) {
      try {
        const workflowsPath = path.join(__dirname, 'workflows', 'aesop');
        this.logger.info(`Registering AESOP workflows from ${workflowsPath}`);
        // Note: Actual workflow registration API depends on Workflows plugin interface
        // This is a placeholder - update when Workflows plugin API is finalized
        // workflows.registerWorkflowsFromDirectory(workflowsPath);
        this.logger.debug('AESOP workflow registration skipped (Workflows API not yet available)');
      } catch (error) {
        this.logger.warn(`Failed to register AESOP workflows: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      this.logger.debug('Workflows plugin not available - AESOP workflows can be triggered via API only');
    }

    return {};
  }

  async start(core: CoreStart, plugins: EvalsStartDependencies): Promise<EvalsPluginStart> {
    this.actionsStart = plugins.actions;
    this.agentBuilderStart = plugins.agentBuilder;

    // ═══════════════════════════════════════════════════════════════
    // AESOP: Ensure ILM policy exists for all .aesop-* indices
    // ═══════════════════════════════════════════════════════════════
    const internalClient = core.elasticsearch.client.asInternalUser;
    ensureAesopILMPolicy(internalClient, this.logger).catch((err) => {
      this.logger.warn(
        `[AESOP] ILM policy setup failed: ${err instanceof Error ? err.message : String(err)}`
      );
    });

    return {
      datasetService: this.datasetService,
    };
  }

  stop() {}
}
