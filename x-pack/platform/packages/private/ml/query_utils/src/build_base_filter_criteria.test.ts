/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBaseFilterCriteria } from './build_base_filter_criteria';

describe('buildBaseFilterCriteria', () => {
  const earliestMs = 1483228800000; // 1 Jan 2017 00:00:00
  const latestMs = 1485907199000; // 31 Jan 2017 23:59:59
  const query = {
    query_string: {
      query: 'region:sa-east-1',
      analyze_wildcard: true,
      default_field: '*',
    },
  };

  test('returns correct criteria for time range', () => {
    expect(buildBaseFilterCriteria('timestamp', earliestMs, latestMs)).toEqual([
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
    ]);
  });

  test('returns correct criteria for time range and query', () => {
    expect(buildBaseFilterCriteria('timestamp', earliestMs, latestMs, query)).toEqual([
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
      query,
    ]);
  });
});
