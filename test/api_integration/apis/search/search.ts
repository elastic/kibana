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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('search', () => {
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body).to.have.property('rawResponse');
      });

      it('should return 404 when if no strategy is provided', async () =>
        await supertest
          .post(`/internal/search`)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404));

      it('should return 404 when if unknown strategy is provided', async () => {
        const resp = await supertest
          .post(`/internal/search/banana`)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);
        expect(resp.body.message).to.contain('banana not found');
      });

      it('should return 400 when index type is provided in OSS', async () => {
        const resp = await supertest
          .post(`/internal/search/es`)
          .send({
            indexType: 'baad',
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        expect(resp.body.message).to.contain('Unsupported index pattern');
      });

      it('should return 400 with a bad body', async () => {
        await supertest
          .post(`/internal/search/es`)
          .send({
            params: {
              body: {
                index: 'nope nope',
                bad_query: [],
              },
            },
          })
          .expect(400);
      });
    });

    describe('delete', () => {
      it('should return 404 when no search id provided', async () => {
        await supertest.delete(`/internal/search/es`).send().expect(404);
      });

      it('should return 400 when trying a delete on a non supporting strategy', async () => {
        const resp = await supertest.delete(`/internal/search/es/123`).send().expect(400);
        expect(resp.body.message).to.contain("Search strategy es doesn't support cancellations");
      });
    });
  });
}
