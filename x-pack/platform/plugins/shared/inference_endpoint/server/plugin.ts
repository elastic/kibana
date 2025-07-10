/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { InferenceEndpointPluginSetup, InferenceEndpointPluginStart } from './types';
import { getInferenceServicesRoute } from './routes';

export class InferenceEndpointPlugin
  implements Plugin<InferenceEndpointPluginSetup, InferenceEndpointPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('inference-endpoint: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    getInferenceServicesRoute(router, this.logger);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('inference-endpoint: Started');
    return {};
  }

  public stop() {}
}
