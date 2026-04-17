/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineConditionsAsAnd, combineConditionsForElseBranch } from './combine_conditions';

describe('combineConditionsAsAnd', () => {
  it('returns the other operand when one side is undefined', () => {
    const c = { field: 'a', eq: '1' };
    expect(combineConditionsAsAnd(undefined, c)).toEqual(c);
    expect(combineConditionsAsAnd(c, undefined)).toEqual(c);
  });

  it('returns an and condition when both operands are defined', () => {
    const a = { field: 'a', eq: '1' };
    const b = { field: 'b', eq: '2' };
    expect(combineConditionsAsAnd(a, b)).toEqual({ and: [a, b] });
  });
});

describe('combineConditionsForElseBranch', () => {
  it('negates the block predicate and combines with the parent', () => {
    const parent = { field: 'a', eq: '1' };
    const predicate = { field: 'b', eq: '2' };
    expect(combineConditionsForElseBranch(parent, predicate)).toEqual({
      and: [parent, { not: predicate }],
    });
  });

  it('returns only NOT(predicate) when there is no parent scope', () => {
    const predicate = { field: 'x', eq: 'y' };
    expect(combineConditionsForElseBranch(undefined, predicate)).toEqual({ not: predicate });
  });
});
