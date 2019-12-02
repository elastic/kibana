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

import { FtrProviderContext } from 'test/api_integration/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('prototype pollution smoke test', () => {
    it('prevents payloads with the "constructor.prototype" pollution vector from being accepted', async () => {
      await supertest
        .post('/api/sample_data/some_data_id')
        .send([
          {
            constructor: {
              prototype: 'foo',
            },
          },
        ])
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: "'constructor.prototype' is an invalid key",
          validation: { source: 'payload', keys: [] },
        });
    });

    it('prevents payloads with the "__proto__" pollution vector from being accepted', async () => {
      await supertest
        .post('/api/sample_data/some_data_id')
        .send(JSON.parse(`{"foo": { "__proto__": {} } }`))
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: "'__proto__' is an invalid key",
          validation: { source: 'payload', keys: [] },
        });
    });
  });
}
