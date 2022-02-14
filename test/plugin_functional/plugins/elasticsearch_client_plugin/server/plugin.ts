/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart, ICustomClusterClient } from 'src/core/server';

export class ElasticsearchClientPlugin implements Plugin {
  private client?: ICustomClusterClient;
  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get(
      { path: '/api/elasticsearch_client_plugin/context/ping', validate: false },
      async (context, req, res) => {
        const body = await context.core.elasticsearch.client.asInternalUser.ping();
        return res.ok({ body: JSON.stringify(body) });
      }
    );
    router.get(
      { path: '/api/elasticsearch_client_plugin/contract/ping', validate: false },
      async (context, req, res) => {
        const [coreStart] = await core.getStartServices();
        const body = await coreStart.elasticsearch.client.asInternalUser.ping();
        return res.ok({ body: JSON.stringify(body) });
      }
    );
    router.get(
      { path: '/api/elasticsearch_client_plugin/custom_client/ping', validate: false },
      async (context, req, res) => {
        const body = await this.client!.asInternalUser.ping();
        return res.ok({ body: JSON.stringify(body) });
      }
    );
  }

  public start(core: CoreStart) {
    this.client = core.elasticsearch.createClient('my-custom-client-test');
  }
  public stop() {}
}
