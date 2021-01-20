/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup } from 'kibana/server';

export interface PluginARequestContext {
  ping: () => Promise<string>;
}

declare module 'kibana/server' {
  interface RequestHandlerContext {
    pluginA?: PluginARequestContext;
  }
}

export class CorePluginAPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    core.http.registerRouteHandlerContext('pluginA', (context) => {
      return {
        ping: () =>
          context.core.elasticsearch.legacy.client.callAsInternalUser('ping') as Promise<string>,
      };
    });
  }

  public start() {}
  public stop() {}
}
