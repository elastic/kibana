/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('csp smoke test', () => {
    it('app response sends content security policy headers', async () => {
      const response = await supertest.get('/app/kibana');

      expect(response.headers).to.have.property('content-security-policy');
      const header = response.headers['content-security-policy'];
      const parsed = new Map(
        header.split(';').map((rule) => {
          const parts = rule.trim().split(' ');
          const key = parts.splice(0, 1)[0];
          return [key, parts];
        })
      );

      const entries = Array.from(parsed.entries());
      expect(entries).to.eql([
        ['script-src', ["'unsafe-eval'", "'self'"]],
        ['worker-src', ['blob:', "'self'"]],
        ['style-src', ["'unsafe-inline'", "'self'"]],
      ]);
    });
  });
}
