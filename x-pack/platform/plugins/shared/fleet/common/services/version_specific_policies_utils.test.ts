/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasVersionSuffix,
  removeVersionSuffixFromPolicyId,
  splitVersionSuffixFromPolicyId,
} from './version_specific_policies_utils';

describe('removeVersionSuffixFromPolicyId', () => {
  it('should remove version suffix from policy ID', () => {
    const policyIdWithVersion = 'policy123#9.2';
    const result = removeVersionSuffixFromPolicyId(policyIdWithVersion);
    expect(result).toBe('policy123');
  });

  it('should return the same policy ID if no version suffix is present', () => {
    const policyIdWithoutVersion = 'policy123';
    const result = removeVersionSuffixFromPolicyId(policyIdWithoutVersion);
    expect(result).toBe('policy123');
  });

  it('should return empty string if policy ID is empty', () => {
    const result = removeVersionSuffixFromPolicyId('');
    expect(result).toEqual('');
  });

  it('should remove version suffix correctly if policy has multiple # characters', () => {
    const complexPolicyId = 'policy#123#9.2';
    const result = removeVersionSuffixFromPolicyId(complexPolicyId);
    expect(result).toBe('policy#123');
  });

  it('should return the same policy ID if there is no version suffix even with # character', () => {
    const policyIdWithHashButNoVersion = 'policy#123';
    const result = removeVersionSuffixFromPolicyId(policyIdWithHashButNoVersion);
    expect(result).toBe('policy#123');
  });
});

describe('splitVersionSuffixFromPolicyId', () => {
  it('should split policy ID and version suffix correctly', () => {
    const policyIdWithVersion = 'policy123#9.2';
    const result = splitVersionSuffixFromPolicyId(policyIdWithVersion);
    expect(result).toEqual({ baseId: 'policy123', version: '9.2' });
  });

  it('should return null for version if no version suffix is present', () => {
    const policyIdWithoutVersion = 'policy123';
    const result = splitVersionSuffixFromPolicyId(policyIdWithoutVersion);
    expect(result).toEqual({ baseId: 'policy123', version: null });
  });

  it('should return null for version if policy ID is empty', () => {
    const result = splitVersionSuffixFromPolicyId('');
    expect(result).toEqual({ baseId: '', version: null });
  });

  it('should split version suffix correctly if policy has multiple # characters', () => {
    const complexPolicyId = 'policy#123#9.2';
    const result = splitVersionSuffixFromPolicyId(complexPolicyId);
    expect(result).toEqual({ baseId: 'policy#123', version: '9.2' });
  });

  it('should return the same policy ID if there is no version suffix even with # character', () => {
    const policyIdWithHashButNoVersion = 'policy#123';
    const result = splitVersionSuffixFromPolicyId(policyIdWithHashButNoVersion);
    expect(result).toEqual({ baseId: 'policy#123', version: null });
  });
});

describe('hasVersionSuffix', () => {
  it('should return true if policy ID has version suffix', () => {
    const policyIdWithVersion = 'policy123#9.2';
    const result = hasVersionSuffix(policyIdWithVersion);
    expect(result).toBe(true);
  });

  it('should return false if policy ID does not have version suffix', () => {
    const policyIdWithoutVersion = 'policy123';
    const result = hasVersionSuffix(policyIdWithoutVersion);
    expect(result).toBe(false);
  });

  it('should return false if policy ID is empty', () => {
    const result = hasVersionSuffix('');
    expect(result).toBe(false);
  });

  it('should return true for complex policy ID with multiple # characters and version suffix', () => {
    const complexPolicyId = 'policy#123#9.2';
    const result = hasVersionSuffix(complexPolicyId);
    expect(result).toBe(true);
  });

  it('should return false for policy ID with # character but no version suffix', () => {
    const policyIdWithHashButNoVersion = 'policy#123';
    const result = hasVersionSuffix(policyIdWithHashButNoVersion);
    expect(result).toBe(false);
  });
});
