/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';

import { getInheritedNamespace } from './agent_policies_helpers';

describe('getInheritedNamespace', () => {
  const agentPolicy: AgentPolicy[] = [
    {
      id: 'agent-policy-1',
      namespace: 'testnamespace',
      name: 'Agent policy 1',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
  ];
  const agentPolicies: AgentPolicy[] = [
    {
      id: 'agent-policy-1',
      namespace: 'testnamespace',
      name: 'Agent policy 1',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
    {
      id: 'agent-policy-2',
      namespace: 'default',
      name: 'Agent policy 2',
      is_managed: false,
      status: 'active',
      updated_at: '',
      updated_by: '',
      revision: 1,
      package_policies: [],
      is_protected: false,
    },
  ];
  it('should return the policy namespace when there is only one agent policy', () => {
    expect(getInheritedNamespace(agentPolicy)).toEqual('testnamespace');
  });

  it('should return default namespace when there is are multiple agent policies', () => {
    expect(getInheritedNamespace(agentPolicies)).toEqual('default');
  });

  it('should return default namespace when there are no agent policies', () => {
    expect(getInheritedNamespace([])).toEqual('default');
  });

  it('should allow to override default namespace when there are no agent policies', () => {
    expect(getInheritedNamespace([], 'test')).toEqual('test');
  });
});
