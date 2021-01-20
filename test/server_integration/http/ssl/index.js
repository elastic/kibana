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
    it('handles requests using ssl', async () => {
      await supertest.get('/').expect(302);
    });
  });
}
