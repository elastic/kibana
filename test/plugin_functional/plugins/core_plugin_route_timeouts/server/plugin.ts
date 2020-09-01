/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
