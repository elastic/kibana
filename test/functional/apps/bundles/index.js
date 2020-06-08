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

/**
 * These supertest-based tests live in the functional test suite because they depend on the optimizer bundles being built
 * and served
 */
export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('bundle compression', function () {
    this.tags(['ciGroup12', 'skipCoverage']);

    let buildNum;
    before(async () => {
      const resp = await supertest.get('/api/status').expect(200);
      buildNum = resp.body.version.build_number;
    });

    it('returns gzip files when client only supports gzip', () =>
      supertest
        // We use the kbn-ui-shared-deps for these tests since they are always built with br compressed outputs,
        // even in dev. Bundles built by @kbn/optimizer are only built with br compression in dist mode.
        .get(`/${buildNum}/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.js`)
        .set('Accept-Encoding', 'gzip')
        .expect(200)
        .expect('Content-Encoding', 'gzip'));

    it('returns br files when client only supports br', () =>
      supertest
        .get(`/${buildNum}/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.js`)
        .set('Accept-Encoding', 'br')
        .expect(200)
        .expect('Content-Encoding', 'br'));

    it('returns br files when client only supports gzip and br', () =>
      supertest
        .get(`/${buildNum}/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.js`)
        .set('Accept-Encoding', 'gzip, br')
        .expect(200)
        .expect('Content-Encoding', 'br'));

    it('returns gzip files when client prefers gzip', () =>
      supertest
        .get(`/${buildNum}/bundles/kbn-ui-shared-deps/kbn-ui-shared-deps.js`)
        .set('Accept-Encoding', 'gzip;q=1.0, br;q=0.5')
        .expect(200)
        .expect('Content-Encoding', 'gzip'));

    it('returns gzip files when no brotli version exists', () =>
      supertest
        .get(`/${buildNum}/bundles/light_theme.style.css`) // legacy optimizer does not create brotli outputs
        .set('Accept-Encoding', 'gzip, br')
        .expect(200)
        .expect('Content-Encoding', 'gzip'));
  });
}
