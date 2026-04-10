/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QUERY_TIMEOUT } from '../../common/constants';
import { validateTimeout } from './validations';

describe('validateTimeout', () => {
  it('should accept the minimum valid value (DEFAULT)', () => {
    expect(validateTimeout(QUERY_TIMEOUT.DEFAULT)).toBeUndefined();
  });

  it('should accept the maximum valid value (MAX)', () => {
    expect(validateTimeout(QUERY_TIMEOUT.MAX)).toBeUndefined();
  });

  it('should accept a value within range', () => {
    expect(validateTimeout(300)).toBeUndefined();
  });

  it('should reject a value above MAX (900)', () => {
    const result = validateTimeout(901);
    expect(result).toBeDefined();
    expect(result).toContain('900');
  });

  it('should reject a value below DEFAULT (60)', () => {
    const result = validateTimeout(1);
    expect(result).toBeDefined();
    expect(result).toContain('60');
  });

  it('should reject zero', () => {
    expect(validateTimeout(0)).toBeDefined();
  });

  it('should reject negative values', () => {
    expect(validateTimeout(-1)).toBeDefined();
  });

  it('should reject NaN', () => {
    expect(validateTimeout(NaN)).toBeDefined();
  });
});
