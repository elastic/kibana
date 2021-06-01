/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup, RequestHandlerContext } from 'kibana/server';

export interface PluginDeepLinksApiRequestContext {
  ping: () => Promise<string>;
}

interface PluginDeepLinksRequstHandlerContext extends RequestHandlerContext {
  pluginDeepLinks: PluginDeepLinksApiRequestContext;
}

export class CorePluginDeepLinksPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    core.http.registerRouteHandlerContext<PluginDeepLinksRequstHandlerContext, 'pluginDeepLinks'>(
      'pluginDeepLinks',
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
