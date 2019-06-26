/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorSeriesPoint } from '../../../../common/graphql/types';
import { formatSparklineCounts } from '../format_sparkline_counts';

describe('formatSparklineCounts', () => {
  let counts: MonitorSeriesPoint[];

  beforeEach(() => {
    counts = [
      { x: 100, y: 50 },
      { x: 200, y: 55 },
      { x: 300, y: 52 },
      { x: 400, y: 60 },
      { x: 500, y: 58 },
    ];
  });

  it('assigns an x0 and x to track point size, and preserves the y-value', () => {
    const result = formatSparklineCounts(counts);
    expect(result[0]).toEqual({ x0: 100, x: 200, y: 50 });
    expect(result[1]).toEqual({ x0: 200, x: 300, y: 55 });
    expect(result[2]).toEqual({ x0: 300, x: 400, y: 52 });
    expect(result[3]).toEqual({ x0: 400, x: 500, y: 60 });
    expect(result[4]).toEqual({ x0: 500, x: 600, y: 58 });
  });

  it('returns an empty array if size === 1', () => {
    const result = formatSparklineCounts([{ x: 1, y: 2 }]);
    expect(result).toEqual([]);
  });
});
