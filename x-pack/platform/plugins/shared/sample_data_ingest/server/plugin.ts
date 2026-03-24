/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SampleDataIngestConfig } from './config';
import type {
  InternalServices,
  SampleDataStartDependencies,
  SampleDataSetupDependencies,
} from './types';

import { SampleDataManager } from './services/sample_data_manager';
import { registerRoutes } from './routes';
import { registerTaskDefinitions } from './tasks';

export class SampleDataIngestPlugin
  implements Plugin<{}, {}, SampleDataSetupDependencies, SampleDataStartDependencies>
{
  private readonly logger: Logger;
  private internalServices?: InternalServices;
  private readonly isServerlessPlatform: boolean;

  constructor(private readonly context: PluginInitializerContext<SampleDataIngestConfig>) {
    this.logger = context.logger.get();
    this.isServerlessPlatform = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(coreSetup: CoreSetup, { taskManager }: SampleDataSetupDependencies): {} {
    const getServices = () => {
      if (!this.internalServices) {
        throw new Error('getServices called before #start');
      }
      return this.internalServices;
    };

    registerTaskDefinitions({
      taskManager,
      getServices,
      core: coreSetup,
    });

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      getServices,
    });

    return {};
  }

  start(core: CoreStart, { taskManager }: SampleDataStartDependencies): {} {
    const sampleDataManager = new SampleDataManager({
      kibanaVersion: this.context.env.packageInfo.version,
      artifactsFolder: 'sample-data-artifacts',
      artifactRepositoryUrl: this.context.config.get().artifactRepositoryUrl,
      elserInferenceId: this.context.config.get().elserInferenceId,
      logger: this.logger,
      isServerlessPlatform: this.isServerlessPlatform,
      taskManager,
    });

    this.internalServices = {
      logger: this.logger,
      sampleDataManager,
      taskManager,
    };

    return {};
  }
}
