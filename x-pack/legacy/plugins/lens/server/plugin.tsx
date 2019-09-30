/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { setupRoutes } from './routes';
import { ScopedSavedObjectsProvider } from './server_options';

export class LensServer implements Plugin<{}, {}, {}, {}> {
  private getScopedSavedObjectsClient: ScopedSavedObjectsProvider;

  constructor(getScopedSavedObjectsClient: ScopedSavedObjectsProvider) {
    this.getScopedSavedObjectsClient = getScopedSavedObjectsClient;
  }

  setup(core: CoreSetup) {
    setupRoutes({
      getScopedSavedObjectsClient: this.getScopedSavedObjectsClient,
      router: core.http.createRouter(),
    });

    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
