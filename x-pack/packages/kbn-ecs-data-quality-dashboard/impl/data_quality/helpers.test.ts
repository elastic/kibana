/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIncompatibleStatColor } from './helpers';

describe('getIncompatibleStatColor', () => {
  test('it returns the expected color when incompatible is greater than zero', () => {
    const incompatible = 123;

    expect(getIncompatibleStatColor(incompatible)).toBe('#bd271e');
  });

  test('it returns undefined when incompatible is zero', () => {
    const incompatible = 0;

    expect(getIncompatibleStatColor(incompatible)).toBeUndefined();
  });

  test('it returns undefined when incompatible is undefined', () => {
    const incompatible = undefined;

    expect(getIncompatibleStatColor(incompatible)).toBeUndefined();
  });
});
