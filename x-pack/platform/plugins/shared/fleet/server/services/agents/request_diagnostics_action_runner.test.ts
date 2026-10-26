/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';

import { createAgentAction, createErrorActionResults } from './actions';
import { requestDiagnosticsBatch } from './request_diagnostics_action_runner';
import { getAgentPolicyRestrictions } from './hosted_agent';

jest.mock('./actions', () => ({
  createAgentAction: jest.fn(),
  createErrorActionResults: jest.fn(),
}));

jest.mock('./hosted_agent', () => ({
  ...jest.requireActual('./hosted_agent'),
  getAgentPolicyRestrictions: jest.fn(),
}));

jest.mock('../app_context', () => ({
  appContextService: {
    getInternalUserSOClientForSpaceId: jest.fn(),
  },
}));

const mockCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;
const mockGetAgentPolicyRestrictions = getAgentPolicyRestrictions as jest.MockedFunction<
  typeof getAgentPolicyRestrictions
>;

const makeAgent = (id: string, policyId: string) =>
  ({
    id,
    active: true,
    policy_id: policyId,
    policy_base_id: policyId,
    local_metadata: { elastic: { agent: { version: '9.2.0' } } },
  } as unknown as Agent);

describe('requestDiagnosticsBatch', () => {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

  beforeEach(() => {
    jest.clearAllMocks();
    (appContextService.getInternalUserSOClientForSpaceId as jest.Mock).mockReturnValue(
      savedObjectsClientMock.create()
    );
    mockGetAgentPolicyRestrictions.mockResolvedValue({
      regular: { is_managed: false, supports_agentless: false },
      agentless: { is_managed: false, supports_agentless: true },
    });
    mockCreateAgentAction.mockResolvedValue({ id: 'action-1' } as any);
  });

  it('does not send the action to agentless agents and records an error for them', async () => {
    await requestDiagnosticsBatch(
      esClient,
      [makeAgent('regular-1', 'regular'), makeAgent('agentless-1', 'agentless')],
      { spaceId: 'default' }
    );

    expect(mockCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      expect.anything(),
      expect.objectContaining({ agents: ['regular-1'], type: 'REQUEST_DIAGNOSTICS' })
    );
    const errors = mockCreateErrorActionResults.mock.calls[0][2];
    expect(Object.keys(errors)).toEqual(['agentless-1']);
    expect(errors['agentless-1'].message).toContain('managed agent');
  });
});
