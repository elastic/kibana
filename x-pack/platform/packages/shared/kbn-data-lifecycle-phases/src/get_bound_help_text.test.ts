/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIntervalBoundHelpText, getTimingBoundHelpText } from './get_bound_help_text';

describe('get_bound_help_text', () => {
  describe('getTimingBoundHelpText()', () => {
    it('returns undefined when unconstrained', () => {
      expect(getTimingBoundHelpText({})).toBeUndefined();
    });

    it('names a phase lower bound', () => {
      expect(
        getTimingBoundHelpText({
          lower: { neighbor: { type: 'phase', phase: 'frozen' }, value: '40d' },
        })
      ).toBe('Must occur after the frozen phase (40d).');
    });

    it('names a previous-step lower bound', () => {
      expect(
        getTimingBoundHelpText({ lower: { neighbor: { type: 'previousStep' }, value: '2d' } })
      ).toBe('Must occur after the previous step (2d).');
    });

    it('names a phase upper bound', () => {
      expect(
        getTimingBoundHelpText({
          upper: { neighbor: { type: 'phase', phase: 'delete' }, value: '40d' },
        })
      ).toBe('Must occur before the delete phase (40d).');
    });

    it('names a phase-to-phase range', () => {
      expect(
        getTimingBoundHelpText({
          lower: { neighbor: { type: 'phase', phase: 'warm' }, value: '30d' },
          upper: { neighbor: { type: 'phase', phase: 'delete' }, value: '50d' },
        })
      ).toBe('Must occur after the warm phase (30d) and before the delete phase (50d).');
    });

    it('names a previous-step-to-phase range', () => {
      expect(
        getTimingBoundHelpText({
          lower: { neighbor: { type: 'previousStep' }, value: '2d' },
          upper: { neighbor: { type: 'phase', phase: 'frozen' }, value: '10d' },
        })
      ).toBe('Must occur after the previous step (2d) and before the frozen phase (10d).');
    });
  });

  describe('getIntervalBoundHelpText()', () => {
    it('returns undefined when unconstrained', () => {
      expect(getIntervalBoundHelpText({})).toBeUndefined();
    });

    it('names a phase upper bound', () => {
      expect(
        getIntervalBoundHelpText({
          upper: { neighbor: { type: 'phase', phase: 'frozen' }, value: '40d' },
        })
      ).toBe('Must be smaller than the frozen phase (40d).');
    });

    it('names a step-interval multiple constraint', () => {
      expect(
        getIntervalBoundHelpText({
          multipleOf: { neighbor: { type: 'stepInterval', stepNumber: 1 }, value: '2d' },
        })
      ).toBe('Must be a multiple of the step 1 interval (2d).');
    });

    it('names a phase multiple constraint', () => {
      expect(
        getIntervalBoundHelpText({
          multipleOf: { neighbor: { type: 'phase', phase: 'hot' }, value: '2d' },
        })
      ).toBe('Must be a multiple of the hot phase (2d).');
    });

    it('names a step-interval multiple constraint and a phase upper bound', () => {
      expect(
        getIntervalBoundHelpText({
          multipleOf: { neighbor: { type: 'stepInterval', stepNumber: 1 }, value: '2d' },
          upper: { neighbor: { type: 'phase', phase: 'frozen' }, value: '40d' },
        })
      ).toBe(
        'Must be a multiple of the step 1 interval (2d) and smaller than the frozen phase (40d).'
      );
    });

    it('names a phase multiple constraint and a phase upper bound', () => {
      expect(
        getIntervalBoundHelpText({
          multipleOf: { neighbor: { type: 'phase', phase: 'hot' }, value: '2d' },
          upper: { neighbor: { type: 'phase', phase: 'warm' }, value: '8d' },
        })
      ).toBe('Must be a multiple of the hot phase (2d) and smaller than the warm phase (8d).');
    });
  });
});
