/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';

import { findAgentlessPolicies } from './helpers';

jest.mock('../agent_policy');
jest.mock('../app_context');

describe('findAgentlessPolicies', () => {
  const mockInternalSoClient = {};
  const mockAgentlessPolicies = {
    items: [
      { id: '1', data_output_id: 'output-1' },
      { id: '2', data_output_id: null },
      { id: '3', data_output_id: 'output-2' },
    ],
  };

  beforeEach(() => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      mockInternalSoClient
    );
    (agentPolicyService.list as jest.Mock).mockResolvedValue(mockAgentlessPolicies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return agentless policies without data_output_id when outputId is not provided', async () => {
    const result = await findAgentlessPolicies();
    expect(result).toEqual([{ id: '2', data_output_id: null }]);
  });

  it('should return agentless policies with the specified outputId or without data_output_id when outputId is provided', async () => {
    const result = await findAgentlessPolicies('output-1');
    expect(result).toEqual([
      { id: '1', data_output_id: 'output-1' },
      { id: '2', data_output_id: null },
    ]);
  });
});
