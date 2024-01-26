/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

// node scripts/functional_tests --config test/api_integration/config.js --grep="Resolve index API"

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Resolve index API', function () {
    it('should return 200 for a search for indices with wildcard', () =>
      supertest.get(`/internal/index-pattern-management/resolve_index/test*`).expect(200));

    it('should return 404 for an exact match index', () =>
      supertest.get(`/internal/index-pattern-management/resolve_index/test`).expect(404));
  });
}
