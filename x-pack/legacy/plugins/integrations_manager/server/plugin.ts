/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, ElasticsearchServiceSetup, HttpServiceSetup } from 'src/core/server';
import { fetchList } from './registry';
import { routes } from './routes';

export interface CoreSetup {
  elasticsearch: ElasticsearchServiceSetup;
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

    // make these items available to handlers via h.context
    // https://github.com/hapijs/hapi/blob/master/API.md#server.bind()
    // aligns closely with approach proposed in handler RFC
    // https://github.com/epixa/kibana/blob/rfc-handlers/rfcs/text/0003_handler_interface.md
    server.bind({ core });

    // map routes to handlers
    routes.forEach(route => server.route(route));

    // the JS API for other consumers
    return {
      getList: fetchList,
    };
  }
  public start(core: CoreStart) {}
}
