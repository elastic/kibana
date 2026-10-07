/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentPoliciesKuery } from './get_agent_policies_kuery';

const PREFIX = 'ingest-agent-policies';
const base = { fieldPrefix: PREFIX, hiddenPolicyName: 'OpAMP' };
const hideOpAMP = `NOT ${PREFIX}.name:"OpAMP"`;

describe('getAgentPoliciesKuery', () => {
  it('only hides the policy without a search', () => {
    expect(getAgentPoliciesKuery({ ...base, search: '' })).toEqual(hideOpAMP);
    expect(getAgentPoliciesKuery({ ...base, search: '   ' })).toEqual(hideOpAMP);
  });

  it('combines the hidden policy clause with a KQL search', () => {
    expect(getAgentPoliciesKuery({ ...base, search: ` ${PREFIX}.name:foo ` })).toEqual(
      `(${hideOpAMP}) AND (${PREFIX}.name:foo)`
    );
  });

  it('combines the hidden policy clause when a quoted value follows a field', () => {
    const search = `${PREFIX}.name:"My policy"`;
    expect(getAgentPoliciesKuery({ ...base, search })).toEqual(`(${hideOpAMP}) AND (${search})`);
  });

  it.each(['agentless', ' My agentless policy ', '"My policy"', 'say "hi"'])(
    'sends the free text %s as is without the hidden policy clause',
    (search) => {
      expect(getAgentPoliciesKuery({ ...base, search })).toEqual(search.trim());
    }
  );

  it.each(['"a:b"', 'foo "a:b" bar', '"say \\"a:b\\""'])(
    'ignores colons inside quotes in %s',
    (search) => {
      expect(getAgentPoliciesKuery({ ...base, search })).toEqual(search);
    }
  );
});
