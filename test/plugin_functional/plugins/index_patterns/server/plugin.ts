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

import { CoreSetup, Plugin } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';

export interface IndexPatternsTestStartDeps {
  data: DataPluginStart;
}

export class IndexPatternsTestPlugin
  implements
    Plugin<
      IndexPatternsTestPluginSetup,
      IndexPatternsTestPluginStart,
      {},
      IndexPatternsTestStartDeps
    > {
  public setup(core: CoreSetup<IndexPatternsTestStartDeps>) {
    const router = core.http.createRouter();

    router.get(
      { path: '/api/index-patterns-plugin/get-all', validate: false },
      async (context, req, res) => {
        const [, { data }] = await core.getStartServices();
        const service = await data.indexPatterns.indexPatternsServiceFactory(req);
        const ids = await service.getIds();
        return res.ok({ body: ids });
      }
    );

    router.get(
      {
        path: '/api/index-patterns-plugin/get/{id}',
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, req, res) => {
        const id = (req.params as Record<string, string>).id;
        const [, { data }] = await core.getStartServices();
        const service = await data.indexPatterns.indexPatternsServiceFactory(req);
        const ip = await service.get(id);
        return res.ok({ body: ip.toSpec() });
      }
    );

    router.get(
      {
        path: '/api/index-patterns-plugin/update/{id}',
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, req, res) => {
        const [, { data }] = await core.getStartServices();
        const id = (req.params as Record<string, string>).id;
        const service = await data.indexPatterns.indexPatternsServiceFactory(req);
        const ip = await service.get(id);
        await ip.save();
        return res.ok();
      }
    );

    router.get(
      {
        path: '/api/index-patterns-plugin/delete/{id}',
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, req, res) => {
        const [, { data }] = await core.getStartServices();
        const id = (req.params as Record<string, string>).id;
        const service = await data.indexPatterns.indexPatternsServiceFactory(req);
        await service.delete(id);
        return res.ok();
      }
    );
  }

  public start() {}
  public stop() {}
}

export type IndexPatternsTestPluginSetup = ReturnType<IndexPatternsTestPlugin['setup']>;
export type IndexPatternsTestPluginStart = ReturnType<IndexPatternsTestPlugin['start']>;
