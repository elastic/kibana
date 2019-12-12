/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { querySignalsSchema } from './query_signals_index_schema';
import { SignalsQueryRestParams } from '../../signals/types';

describe('query and aggs on signals index', () => {
  test('query and aggs simultaneously', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        query: {},
        aggs: {},
      }).error
    ).toBeFalsy();
  });

  test('query only', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        query: {},
      }).error
    ).toBeFalsy();
  });

  test('aggs only', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        aggs: {},
      }).error
    ).toBeFalsy();
  });

  test('missing query and aggs is invalid', () => {
    expect(querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({}).error).toBeTruthy();
  });
});
