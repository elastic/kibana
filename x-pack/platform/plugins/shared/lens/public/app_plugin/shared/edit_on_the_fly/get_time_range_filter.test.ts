/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { getTimeRangeFilter } from './get_time_range_filter';

describe('getTimeRangeFilter', () => {
  const { uiSettings } = coreMock.createStart();
  const timeRange = { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' };

  it('returns undefined without a time field', () => {
    expect(getTimeRangeFilter({ timeRange, uiSettings })).toBeUndefined();
  });

  it('builds a range filter on the time field', () => {
    const filter = getTimeRangeFilter({ timeRange, timeFieldName: '@timestamp', uiSettings });
    expect(JSON.stringify(filter)).toContain('"@timestamp"');
    expect(JSON.stringify(filter)).toContain('"range"');
  });
});
