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
      expect(validateDuration(value)).toMatch(/Invalid duration/);
    }
  );
});

describe('validateEsqlQuery', () => {
  it.each(['FROM logs-* | LIMIT 1', 'FROM index | WHERE field > 0 | LIMIT 10'])(
    'accepts valid ES|QL query "%s"',
    (query) => {
      expect(validateEsqlQuery(query)).toBeUndefined();
    }
  );

  it.each(['FROM |', '| LIMIT 1', 'NOT A QUERY |||'])(
    'rejects invalid ES|QL query "%s"',
    (query) => {
      expect(validateEsqlQuery(query)).toMatch(/Invalid ES\|QL query/);
    }
  );
});
