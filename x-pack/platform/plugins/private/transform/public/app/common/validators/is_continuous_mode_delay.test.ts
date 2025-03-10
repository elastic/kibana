/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isContinuousModeDelay } from './is_continuous_mode_delay';

describe('isContinuousModeDelay', () => {
  it('should allow 0 input without unit', () => {
    expect(isContinuousModeDelay('0')).toBe(true);
  });

  it('should allow 0 input with unit provided', () => {
    expect(isContinuousModeDelay('0s')).toBe(true);
  });

  it('should allow integer input with unit provided', () => {
    expect(isContinuousModeDelay('234nanos')).toBe(true);
  });

  it('should not allow integer input without unit provided', () => {
    expect(isContinuousModeDelay('90000')).toBe(false);
  });

  it('should not allow float input', () => {
    expect(isContinuousModeDelay('122.5d')).toBe(false);
  });
});
