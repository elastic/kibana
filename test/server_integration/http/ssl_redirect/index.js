/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('kibana server with ssl', () => {
    it('redirects http requests at redirect port to https', async () => {
      const host = process.env.TEST_KIBANA_HOST || 'localhost';
      const port = process.env.TEST_KIBANA_PORT || '5620';
      const url = `https://${host}:${port}/`;

      await supertest.get('/').expect('location', url).expect(302);

      await supertest.get('/').redirects(1).expect('location', '/app/home').expect(302);
    });
  });
}
