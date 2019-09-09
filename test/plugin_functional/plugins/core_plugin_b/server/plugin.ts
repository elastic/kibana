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
import { PluginARequestContext } from '../../core_plugin_a/server';

declare module 'kibana/server' {
  interface RequestHandlerContext {
    pluginA?: PluginARequestContext;
  }
}

export class CorePluginBPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get({ path: '/core_plugin_b/', validate: false }, async (context, req, res) => {
      if (!context.pluginA) return res.internalError({ body: 'pluginA is disabled' });
      const response = await context.pluginA.ping();
      return res.ok({ body: `Pong via plugin A: ${response}` });
    });
  }

  public start() {}
  public stop() {}
}
