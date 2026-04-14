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
import { OnlineSuiteRegistry } from './online_suites/registry';
import { getEvalsRunSuiteStepDefinition } from './workflows_steps/run_suite';
import { clusterHealthOnlineSuite } from './online_suites/built_in/cluster_health_suite';

export class EvalsPlugin
  implements
    Plugin<EvalsPluginSetup, EvalsPluginStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: EvalsConfig;
  private datasetService?: DatasetService;
  private onlineSuiteRegistry?: OnlineSuiteRegistry;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    { features, workflowsManagement, workflowsExtensions }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return {
        registerOnlineSuite: () => undefined,
      };
    }

    this.logger.info('Setting up Evals plugin');
    this.datasetService = new DatasetService(this.logger);
    this.onlineSuiteRegistry = new OnlineSuiteRegistry();
    this.onlineSuiteRegistry.register(clusterHealthOnlineSuite);

    if (workflowsExtensions) {
      workflowsExtensions.registerStepDefinition(
        getEvalsRunSuiteStepDefinition({
          coreSetup,
          onlineSuiteRegistry: this.onlineSuiteRegistry,
        })
      );
    }

    coreSetup.http.registerRouteHandlerContext<EvalsRequestHandlerContext, 'evals'>(
      'evals',
      async () => {
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
    registerRoutes({
      router,
      logger: this.logger,
      onlineSuiteRegistry: this.onlineSuiteRegistry,
      workflowsManagement,
    });

    return {
      registerOnlineSuite: (definition) => this.onlineSuiteRegistry?.register(definition),
    };
  }

  start(_core: CoreStart, _plugins: EvalsStartDependencies): EvalsPluginStart {
    return {
      datasetService: this.datasetService,
    };
  }

  stop() {}
}
