/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFlapping } from './v1';

describe('validateFlapping', () => {
  test('should error if look back window exceeds the lower bound', () => {
    const result = validateFlapping({
      look_back_window: 0,
      status_change_threshold: 10,
    });

    expect(result).toEqual('look back window must be between 2 and 20');
  });

  test('should error if look back window exceeds the upper bound', () => {
    const result = validateFlapping({
      look_back_window: 50,
      status_change_threshold: 10,
    });

    expect(result).toEqual('look back window must be between 2 and 20');
  });

  test('should error if status change threshold exceeds the lower bound', () => {
    const result = validateFlapping({
      look_back_window: 10,
      status_change_threshold: 1,
    });

    expect(result).toEqual('status change threshold must be between 2 and 20');
  });

  test('should error if status change threshold exceeds the upper bound', () => {
    const result = validateFlapping({
      look_back_window: 10,
      status_change_threshold: 50,
    });

    expect(result).toEqual('status change threshold must be between 2 and 20');
  });

  test('should error if status change threshold is greater than the look back window', () => {
    const result = validateFlapping({
      look_back_window: 10,
      status_change_threshold: 15,
    });

    expect(result).toEqual(
      'lookBackWindow (10) must be equal to or greater than statusChangeThreshold (15)'
    );
  });
});
