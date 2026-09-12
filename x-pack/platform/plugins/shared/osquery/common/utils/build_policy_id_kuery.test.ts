/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { buildPolicyIdKuery } from './build_policy_id_kuery';

describe('buildPolicyIdKuery', () => {
  it('matches the exact policy id and its version-specific variants', () => {
    expect(buildPolicyIdKuery(['policy-1'])).toBe('policy_id:("policy-1" or policy-1#*)');
  });

  it('combines values for multiple policy ids under a single field prefix', () => {
    expect(buildPolicyIdKuery(['policy-1', 'policy-2'])).toBe(
      'policy_id:("policy-1" or policy-1#* or "policy-2" or policy-2#*)'
    );
  });

  it('deduplicates policy ids', () => {
    expect(buildPolicyIdKuery(['policy-1', 'policy-1'])).toBe(
      'policy_id:("policy-1" or policy-1#*)'
    );
  });

  it('matches nothing for no policy ids', () => {
    expect(buildPolicyIdKuery([])).toBe('policy_id:("")');
  });

  it('escapes ids containing KQL metacharacters', () => {
    expect(buildPolicyIdKuery(['foo or bar*'])).toBe(
      'policy_id:("foo or bar*" or foo \\or bar\\*#*)'
    );
  });

  it('handles an id containing a non-version "#"', () => {
    expect(buildPolicyIdKuery(['policy#123'])).toBe('policy_id:("policy#123" or policy#123#*)');
  });

  it.each([
    [['policy-1']],
    [['0cc4508b-cfa1-4ffd-995f-8e22c009b5d8', '63c2944c-5473-43f8-8e70-afe56366a1c7']],
    [[]],
    [['foo or bar*']],
    [['ns:policy-1']],
    [['my policy']],
    [['policy#123']],
    [['he said "hi"']],
  ])('produces parseable KQL for %j', (ids) => {
    expect(() => fromKueryExpression(buildPolicyIdKuery(ids))).not.toThrow();
  });
});
