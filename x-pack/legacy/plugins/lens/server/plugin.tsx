/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { setupRoutes } from './routes';
import { LensServerOptions } from './server_options';

export class LensServer implements Plugin<{}, {}, {}, {}> {
  private opts: LensServerOptions;

  constructor(opts: LensServerOptions) {
    this.opts = opts;
  }

  setup(core: CoreSetup) {
    setupRoutes(this.opts, core);

    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
