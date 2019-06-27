/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DEFAULT_ARROW_HEIGHT,
  getArrowHeightFromPercent,
  getPercent,
  MAX_ARROW_HEIGHT,
} from './helpers';

describe('helpers', () => {
  describe('#getArrowHeightFromPercent', () => {
    test('it returns the default arrow height when the input is 0%', () => {
      expect(getArrowHeightFromPercent(0)).toEqual(DEFAULT_ARROW_HEIGHT);
    });

    test('it returns undefined when we approach zero (Singularity issue)', () => {
      expect(getPercent({ numerator: 1, denominator: 0.00000000000000009 })).toEqual(undefined);
    });

    test('it returns undefined when we approach zero with a negative number (Singularity issue)', () => {
      expect(getPercent({ numerator: 1, denominator: -0.00000000000000009 })).toEqual(undefined);
    });

    test('it returns the max arrow height when the input is 100%', () => {
      expect(getArrowHeightFromPercent(100)).toEqual(MAX_ARROW_HEIGHT);
    });

    test('it clamps to the default arrow height if the input is less than 0%', () => {
      expect(getArrowHeightFromPercent(-50)).toEqual(DEFAULT_ARROW_HEIGHT);
    });

    test('it clamps to the max arrow height if the input is greater than 100%', () => {
      expect(getArrowHeightFromPercent(150)).toEqual(MAX_ARROW_HEIGHT);
    });

    test('it returns the expected arrow height when the input is 24%', () => {
      expect(getArrowHeightFromPercent(24)).toEqual(1.72);
    });

    test('it returns the expected arrow height when the input is 25%', () => {
      expect(getArrowHeightFromPercent(25)).toEqual(1.75);
    });

    test('it returns the expected arrow height when the input is 50%', () => {
      expect(getArrowHeightFromPercent(50)).toEqual(2.5);
    });

    test('it returns the expected arrow height when the input is 75%', () => {
      expect(getArrowHeightFromPercent(75)).toEqual(3.25);
    });

    test('it returns the expected arrow height when the input is 99%', () => {
      expect(getArrowHeightFromPercent(99)).toEqual(3.9699999999999998);
    });
  });

  describe('#getPercent', () => {
    test('it returns the expected percent when the input is 0 / 100', () => {
      expect(getPercent({ numerator: 0, denominator: 100 })).toEqual(0);
    });

    test('it returns the expected percent when the input is 100 / 100', () => {
      expect(getPercent({ numerator: 100, denominator: 100 })).toEqual(100);
    });

    test('it returns the expected percent when the input is 50 / 100', () => {
      expect(getPercent({ numerator: 50, denominator: 100 })).toEqual(50);
    });

    test('it returns undefined when the denominator is 0', () => {
      expect(getPercent({ numerator: 50, denominator: 0 })).toEqual(undefined);
    });

    test('it returns undefined when the numerator is not a number', () => {
      expect(getPercent({ numerator: NaN, denominator: 100 })).toEqual(undefined);
    });

    test('it returns undefined when the denominator is not a number', () => {
      expect(getPercent({ numerator: 50, denominator: NaN })).toEqual(undefined);
    });
  });
});
