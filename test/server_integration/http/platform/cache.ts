/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../services/types';

export default function ({ getService }: FtrProviderContext) {
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
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect('Cache-Control', 'public, max-age=31536000, immutable')
        .expect(200);
    });

    it('allows the bootstrap bundles to be cached', async () => {
      await supertest
        .get('/bootstrap.js')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect('Cache-Control', 'must-revalidate')
        .expect(200);
    });
  });
}
