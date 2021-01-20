/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { PluginARequestContext } from '../../core_plugin_a/server';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    pluginA?: PluginARequestContext;
  }
}

export class CorePluginBPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get({ path: '/core_plugin_b', validate: false }, async (context, req, res) => {
      if (!context.pluginA) return res.internalError({ body: 'pluginA is disabled' });
      const response = await context.pluginA.ping();
      return res.ok({ body: `Pong via plugin A: ${response}` });
    });

    router.post(
      {
        path: '/core_plugin_b',
        validate: {
          query: schema.object({ id: schema.string() }),
          body: ({ bar, baz } = {}, { ok, badRequest }) => {
            if (typeof bar === 'string' && bar === baz) {
              return ok({ bar, baz });
            } else {
              return badRequest(`bar: ${bar} !== baz: ${baz} or they are not string`);
            }
          },
        },
      },
      async (context, req, res) => {
        return res.ok({ body: `ID: ${req.query.id} - ${req.body.bar.toUpperCase()}` });
      }
    );

    router.post(
      {
        path: '/core_plugin_b/system_request',
        validate: false,
      },
      async (context, req, res) => {
        return res.ok({ body: `System request? ${req.isSystemRequest}` });
      }
    );
  }

  public start() {}
  public stop() {}
}
