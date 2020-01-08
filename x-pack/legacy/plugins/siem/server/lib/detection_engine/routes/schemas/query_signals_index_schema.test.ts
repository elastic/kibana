/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { querySignalsSchema } from './query_signals_index_schema';
import { SignalsQueryRestParams } from '../../signals/types';

describe('query, aggs, size, _source and track_total_hits on signals index', () => {
  test('query, aggs, size, _source and track_total_hits simultaneously', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        query: {},
        aggs: {},
        size: 1,
        track_total_hits: true,
        _source: ['field'],
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

  test('size only', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        size: 1,
      }).error
    ).toBeFalsy();
  });

  test('track_total_hits only', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        track_total_hits: true,
      }).error
    ).toBeFalsy();
  });

  test('_source only', () => {
    expect(
      querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({
        _source: ['field'],
      }).error
    ).toBeFalsy();
  });

  test('missing query, aggs, size, _source and track_total_hits is invalid', () => {
    expect(querySignalsSchema.validate<Partial<SignalsQueryRestParams>>({}).error).toBeTruthy();
  });
});
