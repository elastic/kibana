/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerRoute } from 'hapi';
// import { Legacy } from 'kibana';
// import { LegacyPluginInitializer } from 'src/legacy/types';
import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
  HttpServiceSetup,
  ElasticsearchServiceSetup,
} from 'src/core/server';

import KbnServer, { Server, KibanaConfig } from 'src/legacy/server/kbn_server';
import { setupRoutes } from './routes';

export interface LensInitializerContext extends PluginInitializerContext {
  legacyConfig: KibanaConfig;
}

export interface LensHttpServiceSetup extends HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}

export interface LensCoreSetup {
  http: LensHttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

export interface LensSetup {}
export interface LensStart {}
export interface LensSetupDeps {}
export interface LensStartDeps {}

export class LensServer implements Plugin<LensSetup, LensStart, LensSetupDeps, LensStartDeps> {
  constructor(context: PluginInitializerContext) {}

  setup(core: LensCoreSetup, plugins: LensSetupDeps) {
    setupRoutes(core);

    return {};
  }

  // TODO: Should be a separate type for start
  start(core: LensCoreSetup, plugins: LensSetupDeps) {
    return {};
  }

  stop() {}
}
