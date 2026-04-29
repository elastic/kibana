/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Stats } from '../helpers';
import { getStats } from '.';

describe('getStats', () => {
  it('returns ZERO_STATS for string rawData', () => {
    const context = {
      anonymizationFields: [],
      rawData: 'this will not be anonymized',
    };

    const expectedResult: Stats = {
      allowed: 0,
      anonymized: 0,
      denied: 0,
      total: 0,
    };

    expect(getStats(context)).toEqual(expectedResult);
  });

  it('returns the expected stats for object rawData', () => {
    const context = {
      anonymizationFields: [
        {
          field: 'event.action',
          id: 'test',
          allowed: true,
          anonymized: false,
          createdAt: '',
          timestamp: '',
        },
        {
          field: 'user.name',
          id: 'test1',
          allowed: true,
          anonymized: true,
          createdAt: '',
          timestamp: '',
        },
        {
          field: 'event.category',
          id: 'test2',
          allowed: true,
          anonymized: false,
          createdAt: '',
          timestamp: '',
        },
        {
          field: 'host.ip',
          id: 'test3',
          allowed: false,
          anonymized: true,
          createdAt: '',
          timestamp: '',
        },
      ],
      rawData: {
        'event.category': ['process'],
        'event.action': ['process_stopped'],
        'user.name': ['sean'],
        other: ['this', 'is', 'not', 'allowed'],
      },
    };

    const expectedResult: Stats = {
      allowed: 3,
      anonymized: 1,
      denied: 1,
      total: 4,
    };

    expect(getStats(context)).toEqual(expectedResult);
  });
});
