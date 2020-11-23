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
    it('deletes an index_pattern', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      const response2 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response2.status).to.be(200);

      const response3 = await supertest.delete(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response3.status).to.be(200);

      const response4 = await supertest.get(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(response4.status).to.be(404);
    });

    it('returns nothing', async () => {
      const title = `foo-${Date.now()}-${Math.random()}*`;
      const response1 = await supertest.post('/api/index_patterns/index_pattern').send({
        index_pattern: {
          title,
        },
      });
      await supertest.get('/api/index_patterns/index_pattern/' + response1.body.index_pattern.id);
      const response2 = await supertest.delete(
        '/api/index_patterns/index_pattern/' + response1.body.index_pattern.id
      );

      expect(!!response2.body).to.be(false);
    });
  });
}
