/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerRoute } from 'hapi';
import { Plugin, HttpServiceSetup, ElasticsearchServiceSetup } from 'src/core/server';
import { setupRoutes } from './routes';

export interface LensHttpServiceSetup extends HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}

export interface LensCoreSetup {
  http: LensHttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

export class LensServer implements Plugin<LensCoreSetup, {}, {}, {}> {
  constructor() {}

  setup(core: LensCoreSetup) {
    setupRoutes(core);

    return {};
  }

  // TODO: Should be a separate type for start
  start() {
    return {};
  }

  stop() {}
}
