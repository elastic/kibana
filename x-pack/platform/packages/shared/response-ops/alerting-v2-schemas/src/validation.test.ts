/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDuration, validateEsqlQuery } from './validation';

describe('validateDuration', () => {
  it.each(['500ms', '30s', '5m', '1h', '7d', '2w'])('accepts valid duration "%s"', (value) => {
    expect(validateDuration(value)).toBeUndefined();
  });

  it.each(['', 'abc', '5x', '1.5m', 'm5', '5 m', '5M', '5H', '-1m', '5min', null, undefined, NaN])(
    'rejects invalid duration "%s"',
    (value) => {
      // @ts-expect-error - testing invalid values
      expect(validateDuration(value)).not.toBeUndefined();
    }
  );
});

describe('validateEsqlQuery', () => {
  it('accepts valid ES|QL query', () => {
    expect(validateEsqlQuery('FROM logs-* | LIMIT 1')).toBeUndefined();
  });

  it('rejects invalid ES|QL query', () => {
    expect(validateEsqlQuery('FROM |')).toMatch(/Invalid ES\|QL query/);
  });
});
