/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMatchAllQuery, matchAllQuery } from './match_all_query';

describe('isMatchAllQuery', () => {
  it("should return if it's a match_all query", () => {
    expect(isMatchAllQuery(matchAllQuery)).toBe(true);
    expect(isMatchAllQuery({ query_string: { query: '*' } })).toBe(false);
    expect(isMatchAllQuery({ query_string: { query: 'airline:AAL' } })).toBe(false);
  });
});
