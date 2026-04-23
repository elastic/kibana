/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_TOKENS, sumTokens } from './sum_tokens';

describe('sumTokens', () => {
  const a = { prompt: 10, completion: 20, total: 30, cached: 5 };
  const b = { prompt: 3, completion: 7, total: 10, cached: 2 };

  it('sums total and added', () => {
    expect(sumTokens({ total: a, added: b })).toEqual({
      prompt: 13,
      completion: 27,
      total: 40,
      cached: 7,
    });
  });

  it('defaults total to EMPTY_TOKENS when only added is provided', () => {
    expect(sumTokens({ added: b })).toEqual(b);
  });

  it('returns total unchanged when only total is provided', () => {
    expect(sumTokens({ total: a })).toEqual(a);
  });

  it('returns EMPTY_TOKENS when neither param is provided', () => {
    expect(sumTokens({})).toEqual(EMPTY_TOKENS);
  });

  it('treats missing cached on added as 0', () => {
    const noCached = { prompt: 1, completion: 2, total: 3 };
    expect(sumTokens({ total: a, added: noCached })).toEqual({
      prompt: 11,
      completion: 22,
      total: 33,
      cached: 5,
    });
  });

  it('treats missing cached on total as 0', () => {
    const noCached = { prompt: 1, completion: 2, total: 3 };
    expect(sumTokens({ total: noCached, added: b })).toEqual({
      prompt: 4,
      completion: 9,
      total: 13,
      cached: 2,
    });
  });
});
