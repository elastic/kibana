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

// eslint-disable-next-line import/no-default-export
export default function({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('server plugins', function describeIndexTests() {
    it('extend request handler context', async () => {
      await supertest
        .get('/core_plugin_b')
        .expect(200)
        .expect('Pong via plugin A: true');
    });

    it('extend request handler context with validation', async () => {
      await supertest
        .post('/core_plugin_b')
        .set('kbn-xsrf', 'anything')
        .query({ id: 'TEST' })
        .send({ bar: 'hi!', baz: 'hi!' })
        .expect(200)
        .expect('ID: TEST - HI!');
    });

    it('extend request handler context with validation (400)', async () => {
      await supertest
        .post('/core_plugin_b')
        .set('kbn-xsrf', 'anything')
        .query({ id: 'TEST' })
        .send({ bar: 'hi!', baz: 1234 })
        .expect(400)
        .expect({
          error: 'Bad Request',
          message: '[request body]: bar: hi! !== baz: 1234 or they are not string',
          statusCode: 400,
        });
    });

    it('renders core application implicitly', async () => {
      await supertest.get('/render').expect(200, /app:core/);
    });

    it('renders core application explicitly', async () => {
      await supertest.get('/render/core').expect(200, /app:core/);
    });

    it('renders other application', async () => {
      await supertest.get('/render/core_plugin_b').expect(200, /app:core_plugin_b/);
    });
  });
}
