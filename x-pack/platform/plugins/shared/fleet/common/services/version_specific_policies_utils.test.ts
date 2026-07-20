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
  buildVersionVariantsKueryFragment,
  buildPolicyIdOrVariantsKuery,
  buildPolicyIdsOrVariantsKuery,
  buildVersionVariantsEsFilter,
  buildPolicyIdOrVariantsEsFilter,
  buildPolicyIdsOrVariantsEsFilter,
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

describe('buildVersionVariantsKueryFragment', () => {
  it('should build a kuery fragment matching only version-suffixed variants', () => {
    expect(buildVersionVariantsKueryFragment('my-policy')).toBe('policy_id:my-policy#*');
  });

  it('should use the provided field name', () => {
    expect(buildVersionVariantsKueryFragment('my-policy', 'fleet-agents.policy_id')).toBe(
      'fleet-agents.policy_id:my-policy#*'
    );
  });

  it('should escape special KQL characters in the base id', () => {
    expect(buildVersionVariantsKueryFragment('my policy:1')).toBe('policy_id:my policy\\:1#*');
  });
});

describe('buildPolicyIdOrVariantsKuery', () => {
  it('should build a kuery matching the base id or any version-suffixed variant', () => {
    expect(buildPolicyIdOrVariantsKuery('my-policy')).toBe(
      '(policy_id:"my-policy" or policy_id:my-policy#*)'
    );
  });

  it('should use the provided field name for both clauses', () => {
    expect(buildPolicyIdOrVariantsKuery('my-policy', 'fleet-agents.policy_id')).toBe(
      '(fleet-agents.policy_id:"my-policy" or fleet-agents.policy_id:my-policy#*)'
    );
  });

  it('should escape quotes in both the exact-match and variant clauses', () => {
    expect(buildPolicyIdOrVariantsKuery('my"policy')).toBe(
      '(policy_id:"my\\"policy" or policy_id:my\\"policy#*)'
    );
  });
});

describe('buildPolicyIdsOrVariantsKuery', () => {
  it('should build a kuery matching any of the exact ids or their version-suffixed variants', () => {
    expect(buildPolicyIdsOrVariantsKuery(['policy-1', 'policy-2'])).toBe(
      '(policy_id:(policy-1 or policy-2) or policy_id:policy-1#* or policy_id:policy-2#*)'
    );
  });

  it('should work with a single id', () => {
    expect(buildPolicyIdsOrVariantsKuery(['policy-1'])).toBe(
      '(policy_id:(policy-1) or policy_id:policy-1#*)'
    );
  });

  it('should use the provided field name', () => {
    expect(buildPolicyIdsOrVariantsKuery(['policy-1'], 'fleet-agents.policy_id')).toBe(
      '(fleet-agents.policy_id:(policy-1) or fleet-agents.policy_id:policy-1#*)'
    );
  });

  it('should de-duplicate repeated ids', () => {
    expect(buildPolicyIdsOrVariantsKuery(['policy-1', 'policy-1', 'policy-2'])).toBe(
      '(policy_id:(policy-1 or policy-2) or policy_id:policy-1#* or policy_id:policy-2#*)'
    );
  });

  it('should return a valid, never-matching kuery for an empty array instead of invalid syntax', () => {
    expect(buildPolicyIdsOrVariantsKuery([])).toBe('policy_id:""');
  });
});

describe('buildVersionVariantsEsFilter', () => {
  it('should build a prefix filter matching only version-suffixed variants', () => {
    expect(buildVersionVariantsEsFilter('my-policy')).toEqual({
      prefix: { policy_id: 'my-policy#' },
    });
  });

  it('should use the provided field name', () => {
    expect(buildVersionVariantsEsFilter('my-policy', 'other_field')).toEqual({
      prefix: { other_field: 'my-policy#' },
    });
  });
});

describe('buildPolicyIdOrVariantsEsFilter', () => {
  it('should build a bool.should filter matching the exact id or any variant', () => {
    expect(buildPolicyIdOrVariantsEsFilter('my-policy')).toEqual({
      bool: {
        should: [{ term: { policy_id: 'my-policy' } }, { prefix: { policy_id: 'my-policy#' } }],
        minimum_should_match: 1,
      },
    });
  });

  it('should use the provided field name', () => {
    expect(buildPolicyIdOrVariantsEsFilter('my-policy', 'other_field')).toEqual({
      bool: {
        should: [{ term: { other_field: 'my-policy' } }, { prefix: { other_field: 'my-policy#' } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildPolicyIdsOrVariantsEsFilter', () => {
  it('should build a bool.should filter matching any of the exact ids or their variants', () => {
    expect(buildPolicyIdsOrVariantsEsFilter(['policy-a', 'policy-b'])).toEqual({
      bool: {
        should: [
          { terms: { policy_id: ['policy-a', 'policy-b'] } },
          { prefix: { policy_id: 'policy-a#' } },
          { prefix: { policy_id: 'policy-b#' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('should use the provided field name', () => {
    expect(buildPolicyIdsOrVariantsEsFilter(['policy-a'], 'other_field')).toEqual({
      bool: {
        should: [
          { terms: { other_field: ['policy-a'] } },
          { prefix: { other_field: 'policy-a#' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('should de-duplicate repeated ids', () => {
    expect(buildPolicyIdsOrVariantsEsFilter(['policy-a', 'policy-a'])).toEqual({
      bool: {
        should: [{ terms: { policy_id: ['policy-a'] } }, { prefix: { policy_id: 'policy-a#' } }],
        minimum_should_match: 1,
      },
    });
  });

  it('should return match_none for an empty array instead of an empty terms clause', () => {
    expect(buildPolicyIdsOrVariantsEsFilter([])).toEqual({ match_none: {} });
  });
});
