/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import HapiSwagger from 'hapi-swaggered';
import { HttpServiceSetup, CoreStart } from 'src/core/server';
import { API_ROOT, PLUGIN_ID, PLUGIN_VERSION } from '../common/constants';
import { fetchList } from './registry';
import { routes } from './routes';

export interface CoreSetup {
  http: HttpServiceSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup) {
    const { server } = core.http;

    server.register([
      {
        plugin: HapiSwagger,
        options: {
          endpoint: `${API_ROOT}/swagger.json`,
          requiredTags: [`access:${PLUGIN_ID}`, 'api'],
          info: {
            title: 'API Documentation',
            description: 'Description goes here',
            version: PLUGIN_VERSION,
          },
        },
      },
    ]);

    // map routes to handlers
    routes.forEach(route => server.route(route));

    // the JS API for other consumers
    return {
      getList: fetchList,
    };
  }
  public start(core: CoreStart) {}
}
