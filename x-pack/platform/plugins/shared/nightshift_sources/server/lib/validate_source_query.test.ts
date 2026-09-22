/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { validateSourceQuery } from './validate_source_query';

describe('validateSourceQuery', () => {
  it('throws a 400 Boom with the shared validator message', () => {
    try {
      validateSourceQuery('ROW a = 1');
    } catch (error) {
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(400);
      expect(error.message).toBe('A source query must start with FROM or TS');
      return;
    }
    throw new Error('expected "ROW a = 1" to be rejected');
  });

  it('does not throw when the query is valid', () => {
    expect(() => validateSourceQuery('FROM logs-*')).not.toThrow();
  });
});
