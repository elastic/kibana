/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoolFilterBasedSimpleQuery } from './bool_filter_based_simple_query';
import { simpleQueryMock } from './__mocks__/simple_query';
import { matchAllQuery } from './match_all_query';
import { defaultSimpleQuery } from './simple_query';

describe('isBoolFilterBasedSimpleQuery', () => {
  it('should identify bool filter based simple queries', () => {
    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [simpleQueryMock] },
      })
    ).toBe(true);

    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [simpleQueryMock], must: [], must_not: [], should: [] },
      })
    ).toBe(true);
  });

  it('should identify non-simple queries or differently structured simple queries', () => {
    expect(isBoolFilterBasedSimpleQuery(defaultSimpleQuery)).toBe(false);
    expect(isBoolFilterBasedSimpleQuery(matchAllQuery)).toBe(false);
    expect(isBoolFilterBasedSimpleQuery(simpleQueryMock)).toBe(false);

    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [], must: [], must_not: [], should: [] },
      })
    ).toBe(false);

    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [] },
      })
    ).toBe(false);

    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [matchAllQuery], must: [], must_not: [], should: [] },
      })
    ).toBe(false);

    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [matchAllQuery] },
      })
    ).toBe(false);

    expect(
      isBoolFilterBasedSimpleQuery({
        bool: { filter: [], must: [matchAllQuery], must_not: [] },
      })
    ).toBe(false);
  });
});
