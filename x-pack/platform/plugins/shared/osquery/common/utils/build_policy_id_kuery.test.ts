/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPolicyIdKuery } from './build_policy_id_kuery';

describe('buildPolicyIdKuery', () => {
  it('matches the exact policy id and its version-specific variants', () => {
    expect(buildPolicyIdKuery(['policy-1'])).toBe('(policy_id:policy-1 or policy_id:policy-1#*)');
  });

  it('combines fragments for multiple policy ids', () => {
    expect(buildPolicyIdKuery(['policy-1', 'policy-2'])).toBe(
      '(policy_id:policy-1 or policy_id:policy-1#* or policy_id:policy-2 or policy_id:policy-2#*)'
    );
  });

  it('deduplicates policy ids', () => {
    expect(buildPolicyIdKuery(['policy-1', 'policy-1'])).toBe(
      '(policy_id:policy-1 or policy_id:policy-1#*)'
    );
  });

  it('matches nothing when there are no policy ids', () => {
    expect(buildPolicyIdKuery([])).toBe('policy_id:()');
  });
});
