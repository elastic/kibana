/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramDataPoint } from '../../../../../common/types';
import { getHistogramAriaLabelData } from '../ping_histogram';

describe('getHistogramAriaLabelData', () => {
  it('creates expected object from array', () => {
    const dataPoints: HistogramDataPoint[] = [
      {
        x: 1581022144000,
        downCount: 3,
        upCount: 2,
      },
      {
        x: 1581022174000,
        downCount: 4,
        upCount: 0,
      },
      {
        x: 1581022204000,
        downCount: 3,
        upCount: 1,
      },
    ];

    expect(getHistogramAriaLabelData(dataPoints)).toEqual({
      max: 5,
      maxDownCount: 3,
      maxTimestamp: 1581022144000,
      maxUpCount: 2,
      latestDownCount: 3,
      latestMax: 4,
      latestUpCount: 1,
      latestTimestamp: 1581022204000,
      totalDown: 10,
      totalUp: 3,
    });
  });
});
