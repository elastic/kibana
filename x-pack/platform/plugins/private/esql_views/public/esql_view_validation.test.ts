/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlViewQuerySyntaxError } from './esql_view_validation';

describe('ES|QL view validation', () => {
  describe('getEsqlViewQuerySyntaxError', () => {
    it('accepts valid syntax without resolving the referenced source', async () => {
      await expect(
        getEsqlViewQuerySyntaxError('FROM source-that-does-not-exist | LIMIT 10')
      ).resolves.toBeUndefined();
    });

    it('returns parser errors for invalid syntax', async () => {
      await expect(getEsqlViewQuerySyntaxError('FROM')).resolves.toEqual(expect.any(String));
    });
  });
});
