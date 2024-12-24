/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import type { Agent } from '../../types';

import { filterHostedPolicies } from './filter_hosted_agents';

jest.mock('./hosted_agent', () => ({
  ...jest.requireActual('./hosted_agent'),
  getHostedPolicies: jest.fn().mockResolvedValue({ hosted: true }),
}));

describe('filterHostedPolicies', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  it('should filter out agents with hosted policies', async () => {
    const outgoingErrors = {};
    const agents = await filterHostedPolicies(
      soClient,
      [
        { id: 'agent1', policy_id: 'hosted' },
        { id: 'agent2', policy_id: 'other' },
      ] as Agent[],
      outgoingErrors,
      'error'
    );

    expect(agents).toEqual([{ id: 'agent2', policy_id: 'other' }]);
    expect(outgoingErrors).toEqual({
      agent1: new HostedAgentPolicyRestrictionRelatedError('error'),
    });
  });
});
