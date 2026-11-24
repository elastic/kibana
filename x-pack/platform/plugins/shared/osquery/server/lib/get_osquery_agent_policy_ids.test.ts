/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOsqueryPolicyKuery } from './get_osquery_agent_policy_ids';

describe('buildOsqueryPolicyKuery', () => {
  it('ORs the policy ids together', () => {
    expect(buildOsqueryPolicyKuery(['a', 'b'])).toBe('policy_id:"a" or policy_id:"b"');
  });

  it('never yields an empty clause, which would match every agent', () => {
    const kuery = buildOsqueryPolicyKuery([]);

    expect(kuery).not.toBe('');
    expect(kuery).toContain('policy_id:');
  });

  it('escapes quotes and backslashes inside ids', () => {
    expect(buildOsqueryPolicyKuery(['a"b\\c'])).toBe('policy_id:"a\\"b\\\\c"');
  });
});
