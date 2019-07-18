/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ClusterClient,
  CoreStart,
  ElasticsearchServiceSetup,
  HttpServiceSetup,
} from 'src/core/server';
import { PLUGIN_ID } from '../common/constants';
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
export interface PluginContext {
  esClient: ClusterClient;
}

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup) {
    const { http, elasticsearch } = core;
    const { server } = http;
    const pluginContext: PluginContext = {
      esClient: elasticsearch.createClient(PLUGIN_ID),
    };

    // make pluginContext entries available to handlers via h.context
    // https://github.com/hapijs/hapi/blob/master/API.md#route.options.bind
    // aligns closely with approach proposed in handler RFC
    // https://github.com/epixa/kibana/blob/rfc-handlers/rfcs/text/0003_handler_interface.md
    const routesWithContext = routes.map(function injectRouteContext(route) {
      // merge route.options.bind, defined or otherwise, into pluginContext
      // routes can add extra values or override pluginContext values (e.g. spies, etc)
      if (!route.options) route.options = {};
      route.options.bind = Object.assign(pluginContext, route.options.bind);

      return route;
    });

    // map routes to handlers
    server.route(routesWithContext);

    // the JS API for other consumers
    return {
      getList: fetchList,
    };
  }
  public start(core: CoreStart) {}
}
