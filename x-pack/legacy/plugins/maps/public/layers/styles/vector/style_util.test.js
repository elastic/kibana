/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleValue } from './style_util';

describe('scaleValue', () => {
  test('Should scale value between 0 and 1', () => {
    expect(scaleValue(5, { min: 0, max: 10, delta: 10 })).toBe(0.5);
  });

  test('Should snap value less then range min to 0', () => {
    expect(scaleValue(-1, { min: 0, max: 10, delta: 10 })).toBe(0);
  });

  test('Should snap value greater then range max to 1', () => {
    expect(scaleValue(11, { min: 0, max: 10, delta: 10 })).toBe(1);
  });

  test('Should snap value to 1 when tere is not range delta', () => {
    expect(scaleValue(10, { min: 10, max: 10, delta: 0 })).toBe(1);
  });

  test('Should put value as -1 when value is not provided', () => {
    expect(scaleValue(undefined, { min: 0, max: 10, delta: 10 })).toBe(-1);
  });

  test('Should put value as -1 when range is not provided', () => {
    expect(scaleValue(5, undefined)).toBe(-1);
  });
});
