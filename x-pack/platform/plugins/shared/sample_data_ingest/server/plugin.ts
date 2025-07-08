/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Path from 'path';
import type { Logger } from '@kbn/logging';
import { getDataPath } from '@kbn/utils';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SampleDataIngestConfig } from './config';
import {
  InternalServices,
  SampleDataStartDependencies,
  SampleDataSetupDependencies,
} from './types';

import { SampleDataManager } from './services/sample_data_manager';
import { registerRoutes } from './routes';

export class SampleDataIngestPlugin
  implements Plugin<SampleDataSetupDependencies, SampleDataStartDependencies>
{
  private readonly logger: Logger;
  private internalServices?: InternalServices;
  private readonly isServerlessPlatform: boolean;

  constructor(private readonly context: PluginInitializerContext<SampleDataIngestConfig>) {
    this.logger = context.logger.get();
    this.isServerlessPlatform = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(coreSetup: CoreSetup): SampleDataSetupDependencies {
    const getServices = () => {
      if (!this.internalServices) {
        throw new Error('getServices called before #start');
      }
      return this.internalServices;
    };

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      getServices,
    });

    return {};
  }

  start(): SampleDataStartDependencies {
    const sampleDataManager = new SampleDataManager({
      kibanaVersion: this.context.env.packageInfo.version,
      artifactsFolder: Path.join(getDataPath(), 'sample-data-artifacts'),
      artifactRepositoryUrl: this.context.config.get().artifactRepositoryUrl,
      elserInferenceId: this.context.config.get().elserInferenceId,
      logger: this.logger,
      indexPrefixName: 'sample-data',
      isServerlessPlatform: this.isServerlessPlatform,
    });

    this.internalServices = {
      logger: this.logger,
      sampleDataManager,
    };

    return {};
  }
}
