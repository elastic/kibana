/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService }) {
  const supertest = getService('supertest');

  // Failing: See https://github.com/elastic/kibana/issues/131192
  // Failing: See https://github.com/elastic/kibana/issues/131192
  describe.skip('kibana server with ssl', () => {
    it('redirects http requests at redirect port to https', async () => {
      const host = process.env.TEST_KIBANA_HOST || 'localhost';
      const port = process.env.TEST_KIBANA_PORT || '5620';
      const url = `https://${host}:${port}/`;

      await supertest.get('/').expect('location', url).expect(302);

      await supertest.get('/').redirects(1).expect('location', '/spaces/enter').expect(302);
    });
  });
}
