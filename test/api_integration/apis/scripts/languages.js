/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('Script Languages API', function getLanguages() {
    it('should return 200 with an array of languages', () =>
      supertest
        .get('/api/kibana/scripts/languages')
        .expect(200)
        .then((response) => {
          expect(response.body).to.be.an('array');
        }));

    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('should only return langs enabled for inline scripting', () =>
      supertest
        .get('/api/kibana/scripts/languages')
        .expect(200)
        .then((response) => {
          expect(response.body).to.contain('expression');
          expect(response.body).to.contain('painless');
          expect(response.body).to.not.contain('groovy');
        }));
  });
}
