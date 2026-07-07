/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSwappedWindowParameters } from './get_swapped_window_parameters';

describe('getSwappedWindowParameters', () => {
  it('swaps baseline and deviation parameters', () => {
    const windowParameters = {
      baselineMin: 1,
      baselineMax: 2,
      deviationMin: 3,
      deviationMax: 4,
    };
    const expected = {
      baselineMin: 3,
      baselineMax: 4,
      deviationMin: 1,
      deviationMax: 2,
    };

    const result = getSwappedWindowParameters(windowParameters);

    expect(result).toEqual(expected);
  });
});
