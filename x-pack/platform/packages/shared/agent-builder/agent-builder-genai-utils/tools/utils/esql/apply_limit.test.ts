/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyLimit } from './apply_limit';

describe('applyLimit', () => {
  it('appends LIMIT when the query has no trailing LIMIT', () => {
    expect(applyLimit('FROM idx | WHERE x > 1', 10)).toBe('FROM idx | WHERE x > 1 | LIMIT 10');
  });

  it('narrows an existing trailing LIMIT when it is larger than the param', () => {
    expect(applyLimit('FROM idx | LIMIT 100', 10)).toBe('FROM idx | LIMIT 10');
  });

  it('keeps an existing trailing LIMIT when it is smaller than the param', () => {
    expect(applyLimit('FROM idx | LIMIT 5', 50)).toBe('FROM idx | LIMIT 5');
  });

  it('leaves non-trailing LIMIT untouched and appends a new one', () => {
    expect(applyLimit('FROM idx | LIMIT 100 | SORT x', 10)).toBe(
      'FROM idx | LIMIT 100 | SORT x | LIMIT 10'
    );
  });

  it('handles multiline / formatted queries', () => {
    const query = `FROM idx
| WHERE x > 1
| SORT x`;
    expect(applyLimit(query, 25)).toBe('FROM idx | WHERE x > 1 | SORT x | LIMIT 25');
  });

  it('appends rather than overwriting when the trailing LIMIT uses a parameter', () => {
    expect(applyLimit('FROM idx | LIMIT ?maxRows', 10)).toBe(
      'FROM idx | LIMIT ?maxRows | LIMIT 10'
    );
  });

  it('returns the original query unchanged when parsing produces errors', () => {
    const malformed = 'FROM idx | NOT_A_COMMAND foo';
    expect(applyLimit(malformed, 10)).toBe(malformed);
  });
});
