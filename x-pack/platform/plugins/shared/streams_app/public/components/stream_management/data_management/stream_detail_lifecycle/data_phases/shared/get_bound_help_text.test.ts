/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIntervalBoundHelpText,
  getPhaseBoundName,
  getPreviousStepBoundName,
  getStepIntervalBoundName,
  getTimingBoundHelpText,
} from './get_bound_help_text';

describe('get_bound_help_text', () => {
  describe('bound name helpers', () => {
    it('builds phase and step noun phrases', () => {
      expect(getPhaseBoundName('frozen')).toBe('the frozen phase');
      expect(getPhaseBoundName('delete')).toBe('the delete phase');
      expect(getPreviousStepBoundName()).toBe('the previous step');
      expect(getStepIntervalBoundName(1)).toBe('the step 1 interval');
    });
  });

  describe('getTimingBoundHelpText()', () => {
    it('returns undefined when unconstrained', () => {
      expect(getTimingBoundHelpText({})).toBeUndefined();
    });

    it('names the lower bound', () => {
      expect(
        getTimingBoundHelpText({ lower: { name: getPhaseBoundName('frozen'), value: '40d' } })
      ).toBe('Must occur after the frozen phase (40d).');
    });

    it('names the upper bound', () => {
      expect(
        getTimingBoundHelpText({ upper: { name: getPhaseBoundName('delete'), value: '40d' } })
      ).toBe('Must occur before the delete phase (40d).');
    });

    it('names both bounds as a range', () => {
      expect(
        getTimingBoundHelpText({
          lower: { name: getPreviousStepBoundName(), value: '2d' },
          upper: { name: getPhaseBoundName('frozen'), value: '10d' },
        })
      ).toBe('Must occur after the previous step (2d) and before the frozen phase (10d).');
    });
  });

  describe('getIntervalBoundHelpText()', () => {
    it('returns undefined when unconstrained', () => {
      expect(getIntervalBoundHelpText({})).toBeUndefined();
    });

    it('names only the upper bound', () => {
      expect(
        getIntervalBoundHelpText({ upper: { name: getPhaseBoundName('frozen'), value: '40d' } })
      ).toBe('Must be smaller than the frozen phase (40d).');
    });

    it('names only the multiple constraint', () => {
      expect(
        getIntervalBoundHelpText({
          multipleOf: { name: getStepIntervalBoundName(1), value: '2d' },
        })
      ).toBe('Must be a multiple of the step 1 interval (2d).');
    });

    it('names the multiple constraint and the upper bound', () => {
      expect(
        getIntervalBoundHelpText({
          multipleOf: { name: getStepIntervalBoundName(1), value: '2d' },
          upper: { name: getPhaseBoundName('frozen'), value: '40d' },
        })
      ).toBe(
        'Must be a multiple of the step 1 interval (2d) and smaller than the frozen phase (40d).'
      );
    });
  });
});
