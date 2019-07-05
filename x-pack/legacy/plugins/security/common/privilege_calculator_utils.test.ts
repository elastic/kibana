/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { areActionsFullyCovered, compareActions } from './privilege_calculator_utils';

describe('#compareActions', () => {
  it(`returns -1 when the first action set is more permissive than the second action set`, () => {
    const actionSet1 = ['foo:/*', 'bar'];
    const actionSet2 = ['foo:/*'];
    expect(compareActions(actionSet1, actionSet2)).toEqual(-1);
  });

  it(`returns 1 when the second action set is more permissive than the first action set`, () => {
    const actionSet1 = ['foo:/*'];
    const actionSet2 = ['foo:/*', 'bar'];
    expect(compareActions(actionSet1, actionSet2)).toEqual(1);
  });

  it('works without wildcards', () => {
    const actionSet1 = ['foo:/bar', 'foo:/bar/baz', 'login', 'somethingElse'];
    const actionSet2 = ['foo:/bar', 'foo:/bar/baz', 'login'];
    expect(compareActions(actionSet1, actionSet2)).toEqual(-1);
  });

  it('handles wildcards correctly', () => {
    const actionSet1 = ['foo:/bar/*'];
    const actionSet2 = ['foo:/bar/bam', 'foo:/bar/baz/*'];
    expect(compareActions(actionSet1, actionSet2)).toEqual(-1);
  });

  it('supports ties in a stable-sort order', () => {
    const actionSet1 = ['foo:/bar/bam', 'foo:/bar/baz/*'];
    const actionSet2 = ['foo:/bar/bam', 'foo:/bar/baz/*'];
    expect(compareActions(actionSet1, actionSet2)).toEqual(-1);
  });

  it('does not support actions where one is not a subset of the other', () => {
    const actionSet1 = ['foo:/bar/bam', 'foo:/bar/baz/*'];
    const actionSet2 = ['bar:/*'];

    // check both directions
    expect(() => compareActions(actionSet1, actionSet2)).toThrowErrorMatchingInlineSnapshot(
      `"Non-comparable action sets! Expected one set of actions to be a subset of the other!"`
    );
    expect(() => compareActions(actionSet2, actionSet1)).toThrowErrorMatchingInlineSnapshot(
      `"Non-comparable action sets! Expected one set of actions to be a subset of the other!"`
    );
  });
});

describe('#areActionsFullyCovered', () => {
  it('returns true for two empty sets', () => {
    const actionSet1: string[] = [];
    const actionSet2: string[] = [];
    expect(areActionsFullyCovered(actionSet1, actionSet2)).toEqual(true);
  });

  it('returns true when the first set fully covers the second set', () => {
    const actionSet1: string[] = ['foo:/*', 'bar:/*'];
    const actionSet2: string[] = ['foo:/bar', 'bar:/baz'];

    expect(areActionsFullyCovered(actionSet1, actionSet2)).toEqual(true);
  });

  it('returns false when the first set does not fully cover the second set', () => {
    const actionSet1: string[] = ['foo:/bar', 'bar:/baz'];
    const actionSet2: string[] = ['foo:/*', 'bar:/*'];

    expect(areActionsFullyCovered(actionSet1, actionSet2)).toEqual(false);
  });

  it('returns true for ties', () => {
    const actionSet1: string[] = ['foo:/bar', 'bar:/baz'];
    const actionSet2: string[] = ['foo:/bar', 'bar:/baz'];

    expect(areActionsFullyCovered(actionSet1, actionSet2)).toEqual(true);
  });

  it('can handle actions where one is not a subset of the other', () => {
    const actionSet1 = ['foo:/bar/bam', 'foo:/bar/baz/*'];
    const actionSet2 = ['bar:/*'];

    expect(areActionsFullyCovered(actionSet1, actionSet2)).toEqual(false);
  });
});
