/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRetentionPolicyMaxAge } from './is_retention_policy_max_age';

describe('isRetentionPolicyMaxAge', () => {
  it('should fail when the input is not an integer and valid time unit.', () => {
    expect(isRetentionPolicyMaxAge('0')).toBe(false);
    expect(isRetentionPolicyMaxAge('0.1s')).toBe(false);
    expect(isRetentionPolicyMaxAge('1.1m')).toBe(false);
    expect(isRetentionPolicyMaxAge('10.1asdf')).toBe(false);
  });

  it('should only allow values equal or above 60s.', () => {
    expect(isRetentionPolicyMaxAge('0nanos')).toBe(false);
    expect(isRetentionPolicyMaxAge('59999999999nanos')).toBe(false);
    expect(isRetentionPolicyMaxAge('60000000000nanos')).toBe(true);
    expect(isRetentionPolicyMaxAge('60000000001nanos')).toBe(true);

    expect(isRetentionPolicyMaxAge('0micros')).toBe(false);
    expect(isRetentionPolicyMaxAge('59999999micros')).toBe(false);
    expect(isRetentionPolicyMaxAge('60000000micros')).toBe(true);
    expect(isRetentionPolicyMaxAge('60000001micros')).toBe(true);

    expect(isRetentionPolicyMaxAge('0ms')).toBe(false);
    expect(isRetentionPolicyMaxAge('59999ms')).toBe(false);
    expect(isRetentionPolicyMaxAge('60000ms')).toBe(true);
    expect(isRetentionPolicyMaxAge('60001ms')).toBe(true);

    expect(isRetentionPolicyMaxAge('0s')).toBe(false);
    expect(isRetentionPolicyMaxAge('1s')).toBe(false);
    expect(isRetentionPolicyMaxAge('59s')).toBe(false);
    expect(isRetentionPolicyMaxAge('60s')).toBe(true);
    expect(isRetentionPolicyMaxAge('61s')).toBe(true);
    expect(isRetentionPolicyMaxAge('10000s')).toBe(true);

    expect(isRetentionPolicyMaxAge('0m')).toBe(false);
    expect(isRetentionPolicyMaxAge('1m')).toBe(true);
    expect(isRetentionPolicyMaxAge('100m')).toBe(true);

    expect(isRetentionPolicyMaxAge('0h')).toBe(false);
    expect(isRetentionPolicyMaxAge('1h')).toBe(true);
    expect(isRetentionPolicyMaxAge('2h')).toBe(true);
  });
});
