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

import { Plugin, CoreSetup, IRenderOptions } from 'kibana/server';

import { schema } from '@kbn/config-schema';

export class RenderingPlugin implements Plugin {
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    router.get(
      {
        path: '/render/{id}',
        validate: {
          query: schema.object(
            {
              includeUserSettings: schema.boolean({ defaultValue: true }),
            },
            { allowUnknowns: true }
          ),
          params: schema.object({
            id: schema.maybe(schema.string()),
          }),
        },
      },
      async (context, req, res) => {
        const { id } = req.params;
        const { includeUserSettings } = req.query;
        const app = { getId: () => id! };
        const options: Partial<IRenderOptions> = { app, includeUserSettings };
        const body = await context.core.rendering.render(options);

        return res.ok({
          body,
          headers: {
            'content-security-policy': core.http.csp.header,
          },
        });
      }
    );
  }

  public start() {}

  public stop() {}
}
