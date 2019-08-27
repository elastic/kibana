/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { roundToNearestFiveOrTen } from './round_to_nearest_five_or_ten';

describe('roundToNearestFiveOrTen', () => {
  [
    {
      input: 11,
      output: 10
    },
    {
      input: 45,
      output: 50
    },
    {
      input: 55,
      output: 50
    },
    {
      input: 400,
      output: 500
    },
    {
      input: 1001,
      output: 1000
    },
    {
      input: 2000,
      output: 1000
    },
    {
      input: 4000,
      output: 5000
    },
    {
      input: 20000,
      output: 10000
    },
    {
      input: 80000,
      output: 100000
    }
  ].forEach(({ input, output }) => {
    it(`should convert ${input} to ${output}`, () => {
      expect(roundToNearestFiveOrTen(input)).toBe(output);
    });
  });
});
