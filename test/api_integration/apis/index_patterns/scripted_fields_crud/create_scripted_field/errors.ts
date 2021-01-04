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

  describe('errors', () => {
    it('returns an error field object is not provided', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      const id = response1.body.index_pattern.id;
      const response2 = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field`)
        .send({});

      expect(response2.status).to.be(400);
      expect(response2.body.statusCode).to.be(400);
      expect(response2.body.message).to.be(
        '[request body.field.name]: expected value of type [string] but got [undefined]'
      );
    });

    it('returns an error when creating a non-scripted field', async () => {
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
            scripted: false,
          },
        });

      expect(response2.status).to.be(400);
      expect(response2.body.statusCode).to.be(400);
      expect(response2.body.message).to.be('Only scripted fields can be created.');
    });
  });
}
