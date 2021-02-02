/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  });
}
