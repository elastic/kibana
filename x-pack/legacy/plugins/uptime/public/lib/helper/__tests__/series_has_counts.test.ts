/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { seriesHasYValues } from '../series_has_y_values';

describe('seriesHasCounts', () => {
  it('identifies that a series does have y-values', () => {
    expect.assertions(1);
    expect(seriesHasYValues([{ y: 23 }, { y: 0 }])).toBe(true);
  });

  it('identifies that a series does not have y-values', () => {
    expect.assertions(1);
    expect(seriesHasYValues([{ x: 0 }, { x: 23 }])).toBe(false);
  });
});
