/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../services/types';
// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('kibana server cache-control', () => {
    before(async () => {
      // Wait for status to become green
      let status;
      const start = Date.now();
      do {
        const resp = await supertest.get('/api/status');
        status = resp.status;
        // Stop polling once status stabilizes OR once 40s has passed
      } while (status !== 200 && Date.now() - start < 40_000);
    });

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
