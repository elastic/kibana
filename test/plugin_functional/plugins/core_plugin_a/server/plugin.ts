/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { Plugin, CoreSetup, RequestHandlerContext } from 'kibana/server';

export interface PluginAApiRequestContext {
  ping: () => Promise<string>;
}

interface PluginARequstHandlerContext extends RequestHandlerContext {
  pluginA: PluginAApiRequestContext;
}

export class CorePluginAPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    core.http.registerRouteHandlerContext<PluginARequstHandlerContext, 'pluginA'>(
      'pluginA',
      (context) => {
        return {
          ping: () =>
            context.core.elasticsearch.legacy.client.callAsInternalUser('ping') as Promise<string>,
        };
      }
    );
  }

  public start() {}
  public stop() {}
}
