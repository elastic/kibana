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

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('main', () => {
    it('can update an existing field', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
          fields: {
            foo: {
              name: 'foo',
              type: 'string',
              scripted: true,
              script: "doc['field_name'].value",
            },
            bar: {
              name: 'bar',
              type: 'string',
              scripted: true,
              script: "doc['field_name'].value",
            },
          },
        },
      });

      const response2 = await supertest
        .post(
          `/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/scripted_field/foo`
        )
        .send({
          field: {
            script: "doc['bar'].value",
          },
        });

      expect(response2.body.field.script).to.be("doc['bar'].value");

      const response3 = await supertest.get(
        '/api/index_patterns/index_pattern/' +
          response1.body.index_pattern.id +
          '/scripted_field/foo'
      );

      expect(response3.status).to.be(200);
      expect(response3.body.field.type).to.be('string');
      expect(response3.body.field.script).to.be("doc['bar'].value");
    });
  });
}
