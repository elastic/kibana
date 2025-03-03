/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRangeFilter } from './get_range_filter';

describe('getRangeFilter()', () => {
  it('should return a dummy match_all filter when all arguments are undefined', () => {
    expect(getRangeFilter()).toStrictEqual({
      bool: { must: { match_all: {} } },
    });
  });

  it('should return the range filter to the query if timeRange and datetimeField are provided', () => {
    expect(getRangeFilter('@timestamp', { from: 1613995874349, to: 1614082617000 })).toStrictEqual({
      range: {
        '@timestamp': {
          format: 'epoch_millis',
          gte: 1613995874349,
          lte: 1614082617000,
        },
      },
    });
  });
});
