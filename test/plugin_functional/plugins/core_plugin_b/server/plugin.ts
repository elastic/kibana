/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CustomRequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginAApiRequestContext } from '@kbn/core-plugin-a-plugin/server';

type PluginBContext = CustomRequestHandlerContext<{
  pluginA: PluginAApiRequestContext;
}>;

export class CorePluginBPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter<PluginBContext>();
    router.get({ path: '/core_plugin_b', validate: false }, async (context, req, res) => {
      const pluginAContext = await context.pluginA;
      if (!pluginAContext) throw new Error('pluginA is disabled');
      const response = await pluginAContext.ping();
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
