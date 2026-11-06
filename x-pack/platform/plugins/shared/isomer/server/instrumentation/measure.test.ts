/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkInputBudget,
  gridExamples,
  metricExamples,
  unsupportedExamples,
  xyChartExamples,
} from '@kbn/isomer';
import { measureInput } from './measure';

const cases = [
  ...[...metricExamples, ...xyChartExamples, ...gridExamples, ...unsupportedExamples].map(
    ({ name, node }) => ({ name, value: node as unknown })
  ),
  { name: 'a composition', value: { type: 'view', body: [metricExamples[0].node] } },
  { name: 'scalars', value: [1, -2.5, true, false, null, '', 'é'] },
  { name: 'nested empties', value: { a: {}, b: [], c: [[[]]] } },
];

describe('measureInput', () => {
  // The SDK's own budget check is the oracle: each count is exactly where it starts refusing.
  it.each(cases)('counts $name as checkInputBudget does', ({ value }) => {
    const { values, characters } = measureInput(value);
    const unbounded = Number.MAX_SAFE_INTEGER;
    expect(checkInputBudget(value, { values, characters: unbounded }).valid).toBe(true);
    expect(checkInputBudget(value, { values: values - 1, characters: unbounded }).valid).toBe(
      false
    );
    expect(checkInputBudget(value, { values: unbounded, characters }).valid).toBe(true);
    if (characters > 0) {
      expect(checkInputBudget(value, { values: unbounded, characters: characters - 1 }).valid).toBe(
        false
      );
    }
  });

  it('counts a small value by hand', () => {
    // The object, its array and three leaves; "ab", "c", "1", "null" and "x".
    expect(measureInput({ ab: [1, null], c: 'x' })).toEqual({ values: 5, characters: 9 });
  });
});
