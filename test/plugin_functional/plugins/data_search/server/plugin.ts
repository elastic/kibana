/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';

export interface DataSearchTestStartDeps {
  data: DataPluginStart;
}

export class DataSearchTestPlugin
  implements Plugin<TestPluginSetup, TestPluginStart, {}, DataSearchTestStartDeps>
{
  public setup(core: CoreSetup<DataSearchTestStartDeps>) {
    const router = core.http.createRouter();

    router.get(
      { path: '/api/data_search_plugin/search_source/as_scoped', validate: false },
      async (context, req, res) => {
        const [, { data }] = await core.getStartServices();
        // Just make sure `asScoped` can be called
        await data.search.searchSource.asScoped(req);
        return res.ok();
      }
    );

    router.get(
      { path: '/api/data_search_plugin/search_source/create_empty', validate: false },
      async (context, req, res) => {
        const [, { data }] = await core.getStartServices();
        const service = await data.search.searchSource.asScoped(req);
        const searchSource = service.createEmpty();
        return res.ok({ body: searchSource.serialize() });
      }
    );

    router.post(
      {
        path: '/api/data_search_plugin/search_source/create',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
      async (context, req, res) => {
        const [{ savedObjects, elasticsearch }, { data }] = await core.getStartServices();
        const service = await data.search.searchSource.asScoped(req);
        const clusterClient = elasticsearch.client.asScoped(req).asCurrentUser;
        const savedObjectsClient = savedObjects.getScopedClient(req);

        // Since the index pattern ID can change on each test run, we need
        // to look it up on the fly and insert it into the request.
        const indexPatterns = await data.indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          clusterClient,
          req
        );
        const ids = await indexPatterns.getIds();
        // @ts-expect-error Force overwriting the request
        req.body.index = ids[0];
        const searchSource = await service.create(req.body);

        return res.ok({ body: searchSource.serialize() });
      }
    );
  }

  public start() {}
  public stop() {}
}

export type TestPluginSetup = ReturnType<DataSearchTestPlugin['setup']>;
export type TestPluginStart = ReturnType<DataSearchTestPlugin['start']>;
