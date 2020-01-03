/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { CoreSetup, CoreStart, IClusterClient, PluginInitializerContext } from 'src/core/server';
import { PluginSetupContract } from '../../../../plugins/features/server';
import { PLUGIN } from '../common/constants';
import { Server } from '../server/types';
import { EPMConfigSchema, epmConfigStore } from './config';
import { feature } from './feature';
import { fetchList } from './registry';
import { routes } from './routes';

export { createSetupShim } from './shim';

export interface EPMPluginInitializerContext {
  config: Pick<PluginInitializerContext['config'], 'create' | 'createIfExists'>;
}

export interface EPMCoreSetup {
  elasticsearch: CoreSetup['elasticsearch'];
  hapiServer: Server;
}

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;
export interface PluginContext {
  esClient: IClusterClient;
}

export interface PluginsSetup {
  features: PluginSetupContract;
}

export class Plugin {
  public config$: Observable<EPMConfigSchema>;

  constructor(initializerContext: EPMPluginInitializerContext) {
    this.config$ = initializerContext.config.create<EPMConfigSchema>();
    this.config$.subscribe(configValue => {
      epmConfigStore.updateConfig(configValue);
    });
  }
  public setup(core: EPMCoreSetup, plugins: PluginsSetup) {
    const { elasticsearch, hapiServer } = core;
    const pluginContext: PluginContext = {
      esClient: elasticsearch.createClient(PLUGIN.ID),
    };

    // make pluginContext entries available to handlers via h.context
    // https://github.com/hapijs/hapi/blob/master/API.md#route.options.bind
    // aligns closely with approach proposed in handler RFC
    // https://github.com/epixa/kibana/blob/rfc-handlers/rfcs/text/0003_handler_interface.md
    const routesWithContext = routes.map(function injectRouteContext(route) {
      // merge route.options.bind, defined or otherwise, into pluginContext
      // routes can add extra values or override pluginContext values (e.g. spies, etc)
      if (!route.options) route.options = {};
      route.options.bind = Object.assign({}, pluginContext, route.options.bind);

      return route;
    });

    // map routes to handlers
    hapiServer.route(routesWithContext);

    // register the plugin
    plugins.features.registerFeature(feature);

    // the JS API for other consumers
    return {
      getList: fetchList,
    };
  }
  public start(core: CoreStart) {}
}
