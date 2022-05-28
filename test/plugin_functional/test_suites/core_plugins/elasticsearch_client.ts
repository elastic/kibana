/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  describe('elasticsearch client', () => {
    it('server plugins have access to elasticsearch client via request context', async () => {
      await supertest.get('/api/elasticsearch_client_plugin/context/ping').expect(200, 'true');
    });
    it('server plugins have access to elasticsearch client via core contract', async () => {
      await supertest.get('/api/elasticsearch_client_plugin/contract/ping').expect(200, 'true');
    });
    it('server plugins can create a custom elasticsearch client', async () => {
      await supertest
        .get('/api/elasticsearch_client_plugin/custom_client/ping')
        .expect(200, 'true');
    });
  });
}
