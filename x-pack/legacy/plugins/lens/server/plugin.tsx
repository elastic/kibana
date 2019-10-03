/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { setupRoutes } from './routes';
import { registerLensUsageCollector } from './usage';

export class LensServer implements Plugin<{}, {}, {}, {}> {
  constructor() {}

  setup(
    core: CoreSetup,
    plugins: {
      savedObjects: SavedObjectsLegacyService;
      usage: {
        collectorSet: {
          makeUsageCollector: (options: unknown) => unknown;
          register: (options: unknown) => unknown;
        };
      };
    }
  ) {
    setupRoutes(core);
    registerLensUsageCollector(core, plugins);

    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
