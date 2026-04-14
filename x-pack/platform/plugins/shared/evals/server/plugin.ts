/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
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
import { SuiteRunner } from './lib/suite_runner';

export class EvalsPlugin
  implements
    Plugin<EvalsPluginSetup, EvalsPluginStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: EvalsConfig;
  private readonly repoRoot: string;
  private datasetService?: DatasetService;
  private suiteRunner?: SuiteRunner;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.repoRoot = process.cwd();
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    { features }: EvalsSetupDependencies
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

    try {
      this.suiteRunner = new SuiteRunner(this.repoRoot, this.logger);

      // Sync .scout/servers/local.json with the live Kibana/ES URLs so Scout-based
      // eval suites connect to THIS Kibana (not the default port 5683 that Scout
      // uses when no local config exists). Fire-and-forget: the ES legacy config$
      // observable resolves after setup() returns, but the write is cheap and the
      // suite runs start via an HTTP route so they'll see the updated file.
      void firstValueFrom(coreSetup.elasticsearch.legacy.config$)
        .then((esConfig) => {
          const httpInfo = coreSetup.http.getServerInfo();
          if (httpInfo.protocol !== 'http' && httpInfo.protocol !== 'https') {
            return; // socket or unknown protocol — nothing meaningful to write
          }
          const kibanaUrl = `${httpInfo.protocol}://${httpInfo.hostname}:${httpInfo.port}`;
          const elasticsearchUrl = esConfig.hosts[0];
          if (!elasticsearchUrl) return;
          this.suiteRunner?.syncScoutConfig({ kibanaUrl, elasticsearchUrl });
        })
        .catch((err) => {
          this.logger.warn(
            `[Evals] Failed to resolve server info for SuiteRunner: ${
              err instanceof Error ? err.message : err
            }`
          );
        });
    } catch (err) {
      this.logger.warn(
        `[Evals] Failed to initialize SuiteRunner: ${err instanceof Error ? err.message : err}`
      );
    }

    registerRoutes({
      router,
      logger: this.logger,
      suiteRouteDeps: {
        suiteRunner: this.suiteRunner,
        repoRoot: this.repoRoot,
      },
    });

    return {};
  }

  start(_core: CoreStart, _plugins: EvalsStartDependencies): EvalsPluginStart {
    return {
      datasetService: this.datasetService,
    };
  }

  stop() {}
}
