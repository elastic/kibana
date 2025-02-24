/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { retentionPolicyMaxAgeValidator } from './retention_policy_max_age_validator';

describe('Transform: retentionPolicyMaxAgeValidator()', () => {
  it('should only allow values equal or above 60s.', () => {
    expect(retentionPolicyMaxAgeValidator('0nanos')).toEqual(['The frequency value is not valid.']);
    expect(retentionPolicyMaxAgeValidator('59999999999nanos')).toEqual([
      'Invalid max age format. Minimum of 60s required.',
    ]);
    expect(retentionPolicyMaxAgeValidator('60000000000nanos')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('60000000001nanos')).toEqual([]);

    expect(retentionPolicyMaxAgeValidator('0micros')).toEqual([
      'The frequency value is not valid.',
    ]);
    expect(retentionPolicyMaxAgeValidator('59999999micros')).toEqual([
      'Invalid max age format. Minimum of 60s required.',
    ]);
    expect(retentionPolicyMaxAgeValidator('60000000micros')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('60000001micros')).toEqual([]);

    expect(retentionPolicyMaxAgeValidator('0ms')).toEqual(['The frequency value is not valid.']);
    expect(retentionPolicyMaxAgeValidator('59999ms')).toEqual([
      'Invalid max age format. Minimum of 60s required.',
    ]);
    expect(retentionPolicyMaxAgeValidator('60000ms')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('60001ms')).toEqual([]);

    expect(retentionPolicyMaxAgeValidator('0s')).toEqual(['The frequency value is not valid.']);
    expect(retentionPolicyMaxAgeValidator('1s')).toEqual([
      'Invalid max age format. Minimum of 60s required.',
    ]);
    expect(retentionPolicyMaxAgeValidator('59s')).toEqual([
      'Invalid max age format. Minimum of 60s required.',
    ]);
    expect(retentionPolicyMaxAgeValidator('60s')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('61s')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('10000s')).toEqual([]);

    expect(retentionPolicyMaxAgeValidator('0m')).toEqual(['The frequency value is not valid.']);
    expect(retentionPolicyMaxAgeValidator('1m')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('100m')).toEqual([]);

    expect(retentionPolicyMaxAgeValidator('0h')).toEqual(['The frequency value is not valid.']);
    expect(retentionPolicyMaxAgeValidator('1h')).toEqual([]);
    expect(retentionPolicyMaxAgeValidator('2h')).toEqual([]);
  });
});
