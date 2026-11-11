/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';

import type { AgentPolicySOAttributes } from '../../types';

import { mapAgentPolicySavedObjectToAgentPolicy } from './utils';

describe('mapAgentPolicySavedObjectToAgentPolicy', () => {
  const buildSo = (attributes: Record<string, unknown>) =>
    ({
      id: 'canonical-id',
      type: 'fleet-agent-policies',
      namespaces: ['default'],
      attributes: { name: 'Policy', namespace: 'default', ...attributes },
      references: [],
    } as unknown as SavedObject<AgentPolicySOAttributes>);

  it('returns the saved object id', () => {
    expect(mapAgentPolicySavedObjectToAgentPolicy(buildSo({})).id).toBe('canonical-id');
  });

  it('does not let a stored attributes.id override the saved object id', () => {
    const policy = mapAgentPolicySavedObjectToAgentPolicy(
      buildSo({ id: '../../../../\\@bad-account.co' })
    );

    expect(policy.id).toBe('canonical-id');
    expect(policy.name).toBe('Policy');
  });
});
