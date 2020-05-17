/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from 'kibana/server';

import { BackgroundSessionExamplePluginSetup, BackgroundSessionExamplePluginStart } from './types';
import { defineRoutes } from './routes';

export class BackgroundSessionExamplePlugin
  implements Plugin<BackgroundSessionExamplePluginSetup, BackgroundSessionExamplePluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('backgroundSessionExample: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('backgroundSessionExample: Started');

    return {};
  }

  public stop() {}
}
