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
          body: ({ ok, fail }, { bar, baz } = {}) => {
            if (typeof bar === 'string' && bar === baz) {
              return ok({ bar, baz });
            } else {
              return fail(`bar: ${bar} !== baz: ${baz} or they are not string`);
            }
          },
        },
      },
      async (context, req, res) => {
        return res.ok({ body: `ID: ${req.query.id} - ${req.body.bar.toUpperCase()}` });
      }
    );
  }

  public start() {}
  public stop() {}
}
