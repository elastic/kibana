/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { setupRoutes } from './routes';

export class LensServer implements Plugin<{}, {}, {}, {}> {
  constructor() {}

  setup(core: CoreSetup) {
    setupRoutes(core);

    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
