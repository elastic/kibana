/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { simpleQueryMock } from './__mocks__/simple_query';
import { defaultSimpleQuery, isSimpleQuery, isSimpleDefaultQuery } from './simple_query';
import { matchAllQuery } from './match_all_query';

describe('isSimpleQuery', () => {
  it("should return if it's a simple query", () => {
    expect(isSimpleQuery(defaultSimpleQuery)).toBe(true);
    expect(isSimpleQuery(matchAllQuery)).toBe(false);
    expect(isSimpleQuery(simpleQueryMock)).toBe(true);
  });
});

describe('isSimpleDefaultQuery', () => {
  it("should return if it's a simple default query", () => {
    expect(isSimpleDefaultQuery(defaultSimpleQuery)).toBe(true);
    expect(isSimpleDefaultQuery(matchAllQuery)).toBe(false);
    expect(isSimpleDefaultQuery(simpleQueryMock)).toBe(false);
  });
});
