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

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('msearch', () => {
    describe('post', () => {
      it('should return 200 when correctly formatted searches are provided', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [
              {
                header: { index: 'foo' },
                body: {
                  query: {
                    match_all: {},
                  },
                },
              },
            ],
          })
          .expect(200));

      it('should return 400 if you provide malformed content', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            foo: false,
          })
          .expect(400));

      it('should require you to provide an index for each request', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [
              { header: { index: 'foo' }, body: {} },
              { header: {}, body: {} },
            ],
          })
          .expect(400));

      it('should not require optional params', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [{ header: { index: 'foo' }, body: {} }],
          })
          .expect(200));

      it('should allow passing preference as a string', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [{ header: { index: 'foo', preference: '_custom' }, body: {} }],
          })
          .expect(200));

      it('should allow passing preference as a number', async () =>
        await supertest
          .post(`/internal/_msearch`)
          .send({
            searches: [{ header: { index: 'foo', preference: 123 }, body: {} }],
          })
          .expect(200));
    });
  });
}
