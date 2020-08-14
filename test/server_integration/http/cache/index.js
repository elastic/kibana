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

// eslint-disable-next-line import/no-default-export
export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('kibana server cache-control', () => {
    it('properly marks responses as private, with directives to disable caching', async () => {
      await supertest
        .get('/api/status')
        .expect('Cache-Control', 'private, no-cache, no-store, must-revalidate')
        .expect(200);
    });

    it('allows translation bundles to be cached', async () => {
      await supertest
        .get('/translations/en.json')
        .expect('Cache-Control', 'must-revalidate')
        .expect(200);
    });

    it('allows the bootstrap bundles to be cached', async () => {
      await supertest.get('/bootstrap.js').expect('Cache-Control', 'must-revalidate').expect(200);
    });
  });
}
