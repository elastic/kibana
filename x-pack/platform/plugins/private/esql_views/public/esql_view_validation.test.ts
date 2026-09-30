/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEsqlViewQuerySyntaxError,
  MAX_ESQL_VIEW_NAME_LENGTH,
  validateEsqlViewName,
} from './esql_view_validation';

describe('ES|QL view validation', () => {
  describe('validateEsqlViewName', () => {
    it('accepts names allowed by the Elasticsearch view API', () => {
      expect(validateEsqlViewName('sales.view-2026_data')).toBeUndefined();
      expect(validateEsqlViewName('sales@view=2026')).toBeUndefined();
    });

    it('requires a name', () => {
      expect(validateEsqlViewName('')).toBe('required');
    });

    it.each(['Sales-view', 'sales view', 'sales#view', '-sales-view', '.', '..'])(
      'rejects the invalid name %s',
      (name) => {
        expect(validateEsqlViewName(name)).toBe('invalidFormat');
      }
    );

    it('bounds the name length in UTF-8 bytes', () => {
      expect(validateEsqlViewName('a'.repeat(MAX_ESQL_VIEW_NAME_LENGTH + 1))).toBe('tooLong');
      expect(validateEsqlViewName('é'.repeat(128))).toBe('tooLong');
    });
  });

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
