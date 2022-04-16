/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';

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
    >
{
  public setup(core: CoreSetup<IndexPatternsTestStartDeps>) {
    const router = core.http.createRouter();

    router.post(
      {
        path: '/api/index-patterns-plugin/create',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
      },
      async (context, req, res) => {
        const [{ savedObjects, elasticsearch }, { data }] = await core.getStartServices();
        const savedObjectsClient = savedObjects.getScopedClient(req);
        const service = await data.indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearch.client.asScoped(req).asCurrentUser,
          req
        );
        const ids = await service.createAndSave(req.body);
        return res.ok({ body: ids });
      }
    );

    router.get(
      { path: '/api/index-patterns-plugin/get-all', validate: false },
      async (context, req, res) => {
        const [{ savedObjects, elasticsearch }, { data }] = await core.getStartServices();
        const savedObjectsClient = savedObjects.getScopedClient(req);
        const service = await data.indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearch.client.asScoped(req).asCurrentUser,
          req
        );
        const ids = await service.getIds(true);
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
        const [{ savedObjects, elasticsearch }, { data }] = await core.getStartServices();
        const savedObjectsClient = savedObjects.getScopedClient(req);
        const service = await data.indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearch.client.asScoped(req).asCurrentUser,
          req
        );
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
        const [{ savedObjects, elasticsearch }, { data }] = await core.getStartServices();
        const id = (req.params as Record<string, string>).id;
        const savedObjectsClient = savedObjects.getScopedClient(req);
        const service = await data.indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearch.client.asScoped(req).asCurrentUser,
          req
        );
        const ip = await service.get(id);
        await service.updateSavedObject(ip);
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
        const [{ savedObjects, elasticsearch }, { data }] = await core.getStartServices();
        const id = (req.params as Record<string, string>).id;
        const savedObjectsClient = savedObjects.getScopedClient(req);
        const service = await data.indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearch.client.asScoped(req).asCurrentUser,
          req
        );
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
