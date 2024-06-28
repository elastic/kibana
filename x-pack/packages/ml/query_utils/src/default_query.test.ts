/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { simpleQueryMock } from './__mocks__/simple_query';
import { isDefaultQuery } from './default_query';
import { matchAllQuery } from './match_all_query';
import { defaultSimpleQuery } from './simple_query';

describe('isDefaultQuery', () => {
  it("should return if it's a default query", () => {
    expect(isDefaultQuery(defaultSimpleQuery)).toBe(true);
    expect(isDefaultQuery(matchAllQuery)).toBe(true);
    expect(isDefaultQuery(simpleQueryMock)).toBe(false);
  });
});
