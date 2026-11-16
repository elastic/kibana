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

  it('preserves the formatting of multiline queries', () => {
    const query = `FROM idx
| WHERE x > 1
| SORT x
`;
    expect(applyLimit(query, 25)).toBe(`FROM idx
| WHERE x > 1
| SORT x
| LIMIT 25`);
  });

  it('narrows a trailing LIMIT without reformatting the rest of the query', () => {
    const query = `FROM idx
| WHERE  x > 1
| LIMIT 100 // keep the comment`;
    expect(applyLimit(query, 10)).toBe(`FROM idx
| WHERE  x > 1
| LIMIT 10 // keep the comment`);
  });

  it('appends the LIMIT on a new line when the query ends with a line comment', () => {
    expect(applyLimit('FROM idx | SORT x // newest first', 10)).toBe(
      'FROM idx | SORT x // newest first\n| LIMIT 10'
    );
  });

  it('preserves the text of unaliased PROMQL expressions, which name the value column', () => {
    const query =
      'PROMQL index=idx step=1m 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)';
    expect(applyLimit(query, 10)).toBe(`${query} | LIMIT 10`);
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
