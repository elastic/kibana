/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sizeIsOutOfRange } from '.';
import { MAX_SIZE, MIN_SIZE } from '../types';

describe('sizeIsOutOfRange', () => {
  it('returns true when size is undefined', () => {
    const size = undefined;

    expect(sizeIsOutOfRange(size)).toBe(true);
  });

  it('returns true when size is less than MIN_SIZE', () => {
    const size = MIN_SIZE - 1;

    expect(sizeIsOutOfRange(size)).toBe(true);
  });

  it('returns true when size is greater than MAX_SIZE', () => {
    const size = MAX_SIZE + 1;

    expect(sizeIsOutOfRange(size)).toBe(true);
  });

  it('returns false when size is exactly MIN_SIZE', () => {
    const size = MIN_SIZE;

    expect(sizeIsOutOfRange(size)).toBe(false);
  });

  it('returns false when size is exactly MAX_SIZE', () => {
    const size = MAX_SIZE;

    expect(sizeIsOutOfRange(size)).toBe(false);
  });

  it('returns false when size is within the valid range', () => {
    const size = MIN_SIZE + 1;

    expect(sizeIsOutOfRange(size)).toBe(false);
  });
});
