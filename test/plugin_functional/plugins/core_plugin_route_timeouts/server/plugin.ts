/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export interface PluginARequestContext {
  ping: () => Promise<string>;
}

declare module 'kibana/server' {
  interface RequestHandlerContext {
    pluginA?: PluginARequestContext;
  }
}

export class CorePluginRouteTimeoutsPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const { http } = core;

    const router = http.createRouter();

    router.post(
      {
        options: {
          body: {
            accepts: ['application/json'],
          },
          timeout: { payload: 100 },
        },
        path: '/short_payload_timeout',
        validate: false,
      },
      async (context, req, res) => {
        return res.ok({});
      }
    );

    router.post(
      {
        options: {
          body: {
            accepts: ['application/json'],
          },
          timeout: { payload: 10000 },
        },
        path: '/longer_payload_timeout',
        validate: false,
      },
      async (context, req, res) => {
        return res.ok({});
      }
    );

    router.post(
      {
        options: {
          body: {
            accepts: ['application/json'],
          },
          timeout: { idleSocket: 10 },
        },
        path: '/short_idle_socket_timeout',
        validate: {
          body: schema.maybe(
            schema.object({
              responseDelay: schema.maybe(schema.number()),
            })
          ),
        },
      },
      async (context, req, res) => {
        if (req.body?.responseDelay) {
          await new Promise((resolve) => setTimeout(resolve, req.body!.responseDelay));
        }
        return res.ok({});
      }
    );

    router.post(
      {
        options: {
          body: {
            accepts: ['application/json'],
          },
          timeout: { idleSocket: 5000 },
        },
        path: '/longer_idle_socket_timeout',
        validate: {
          body: schema.maybe(
            schema.object({
              responseDelay: schema.maybe(schema.number()),
            })
          ),
        },
      },
      async (context, req, res) => {
        if (req.body?.responseDelay) {
          await new Promise((resolve) => setTimeout(resolve, req.body!.responseDelay));
        }
        return res.ok({});
      }
    );
  }

  public start() {}
  public stop() {}
}
