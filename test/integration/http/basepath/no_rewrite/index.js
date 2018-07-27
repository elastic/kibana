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

export default function ({ getService }) {

  const supertest = getService('supertest');

  // All these tests send requests to the base path proxy server
  // probably configured to be on port 5620

  describe('Kibana server with basePath and without rewriteBasePath', () => {
    const basePath = '/abc/xyz';

    it('requests to the basePath redirect once', async () => {
      // When not following redirects, check for 302 Found
      // and make sure the location header contains basePath
      await supertest.get(`/abc/xyz`)
        .expect(302)
        .expect('Location', `${basePath}/app/kibana`);

      // When following redirects, check for 200 OK
      await supertest.get(`/abc/xyz`)
        .redirects(1)
        .expect(200);
    });

    it('requests to root path redirect twice', async () => {
      await supertest.get(`/`)
        .expect(302)
        .expect('Location', `${basePath}`);

      await supertest.get(`/`)
        .redirects(1)
        .expect(302)
        .expect('location', `${basePath}/app/kibana`);

      await supertest.get(`/`)
        .redirects(2)
        .expect(200);
    });

    it('cannot find app requests without basePath', async () => {
      await supertest.get(`/app/kibana`)
        .expect(404);

      await supertest.get(`/abc/xyz/app/kibana`)
        .expect(200);
    });

    it('requests to old basePath redirect once to new basePath', async () => {
      await supertest.get(`/def/app/kibana`)
        .expect(302)
        .expect('Location', `${basePath}/app/kibana`);

      await supertest.get(`/def/app/kibana`)
        .redirects(1)
        .expect(200);
    });
  });
}
