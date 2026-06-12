/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFilterBasedDefaultQuery } from './filter_based_default_query';
import { simpleQueryMock } from './__mocks__/simple_query';
import { matchAllQuery } from './match_all_query';
import { defaultSimpleQuery } from './simple_query';

describe('isFilterBasedDefaultQuery', () => {
  it('should identify filter based default queries', () => {
    expect(
      isFilterBasedDefaultQuery({
        bool: { filter: [], must: [], must_not: [], should: [] },
      })
    ).toBe(true);
    expect(
      isFilterBasedDefaultQuery({
        bool: { filter: [matchAllQuery], must: [], must_not: [], should: [] },
      })
    ).toBe(true);
    expect(
      isFilterBasedDefaultQuery({
        bool: { filter: [], must: [matchAllQuery], must_not: [] },
      })
    ).toBe(true);
  });

  it('should identify non-default queries', () => {
    expect(isFilterBasedDefaultQuery(defaultSimpleQuery)).toBe(false);
    expect(isFilterBasedDefaultQuery(matchAllQuery)).toBe(false);
    expect(isFilterBasedDefaultQuery(simpleQueryMock)).toBe(false);
    expect(
      isFilterBasedDefaultQuery({
        bool: { filter: [simpleQueryMock], must: [], must_not: [], should: [] },
      })
    ).toBe(false);
    expect(
      isFilterBasedDefaultQuery({
        bool: { filter: [], must: [matchAllQuery], must_not: [], should: [simpleQueryMock] },
      })
    ).toBe(false);
    expect(
      isFilterBasedDefaultQuery({
        bool: { filter: [], must: [matchAllQuery], must_not: [simpleQueryMock] },
      })
    ).toBe(false);
  });
});
