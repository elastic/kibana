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
    it('can create a new scripted field', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      const id = response1.body.index_pattern.id;
      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field`)
        .send({
          field: {
            name: 'bar',
            type: 'number',
            scripted: true,
            script: "doc['field_name'].value",
          },
        });

      expect(response2.status).to.be(200);
      expect(response2.body.field.name).to.be('bar');
      expect(response2.body.field.type).to.be('number');
      expect(response2.body.field.scripted).to.be(true);
      expect(response2.body.field.script).to.be("doc['field_name'].value");
    });

    it('newly created scripted field is materialized in the index_pattern object', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });

      await supertest
        .post(`/api/index_patterns/index_pattern/${response1.body.index_pattern.id}/scripted_field`)
        .send({
          field: {
            name: 'bar',
            type: 'number',
            scripted: true,
            script: "doc['field_name'].value",
          },
        });

      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response2.status).to.be(200);

      const field = response2.body.index_pattern.fields.bar;

      expect(field.name).to.be('bar');
      expect(field.type).to.be('number');
      expect(field.scripted).to.be(true);
      expect(field.script).to.be("doc['field_name'].value");
    });
  });
}
