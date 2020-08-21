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
import { PluginFunctionalProviderContext } from '../../services';
import '../../plugins/core_provider_plugin/types';

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
