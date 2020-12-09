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
    it('returns 404 error on non-existing index_pattern', async () => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      const response = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field/foo`)
        .send({
          field: {
            type: 'number',
            scripted: true,
          },
        });

      expect(response.status).to.be(404);
    });

    it('returns error when field name is specified', async () => {
      const id = `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-${Date.now()}`;
      const response = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field/foo`)
        .send({
          field: {
            name: 'foo',
            type: 'number',
            scripted: true,
          },
        });

      expect(response.status).to.be(400);
      expect(response.body.statusCode).to.be(400);
      expect(response.body.message).to.be(
        "[request body.field.name]: a value wasn't expected to be present"
      );
    });

    it('returns error when ID is too long', async () => {
      const id = `xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxxx`;
      const response = await supertest
        .post(`/api/index_patterns/index_pattern/${id}/scripted_field/foo`)
        .send({
          field: {
            field: {
              type: 'number',
              scripted: true,
            },
          },
        });

      expect(response.status).to.be(400);
      expect(response.body.message).to.be(
        '[request params.id]: value has length [1759] but it must have a maximum length of [1000].'
      );
    });
  });
}
