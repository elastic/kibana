/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownloadSource } from '../../../../../types';
import { sendGetAgents, sendGetAgentPolicies } from '../../../../../hooks';

import { getCountsForDownloadSource } from './get_count';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  sendGetAgents: jest.fn(),
  sendGetAgentPolicies: jest.fn(),
}));

const mockedSendGetAgents = sendGetAgents as jest.Mock;
const mockedSendGetAgentPolicies = sendGetAgentPolicies as jest.Mock;

describe('getCountsForDownloadSource', () => {
  const downloadSource: DownloadSource = {
    name: 'New Host',
    host: 'https://test-registry.co/path',
    id: 'test-ds-1',
    is_default: false,
  };

  beforeEach(async () => {
    const mapAgents = (ids: string[]) =>
      ids.map((agent) => ({
        id: agent,
        active: true,
        policy_id: 'policy1',
        local_metadata: { host: { hostname: agent } },
      }));
    mockedSendGetAgents.mockResolvedValueOnce({
      data: {
        items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent5']),
        total: 6,
        totalInactive: 0,
      },
    });

    mockedSendGetAgentPolicies.mockResolvedValueOnce({
      data: {
        items: [
          {
            name: 'Agent policy 1',
            namespace: 'default',
            description: '',
            monitoring_enabled: ['logs', 'metrics'],
            download_source_id: 'test-ds-1',
          },
          {
            name: 'Agent policy 2',
            namespace: 'default',
            description: '',
            monitoring_enabled: ['logs', 'metrics'],
            download_source_id: 'test-ds-1',
          },
        ],
      },
    });
  });

  it('return agentPolicyCount and agentCount', async () => {
    expect(await getCountsForDownloadSource(downloadSource)).toEqual({
      agentCount: 6,
      agentPolicyCount: 2,
    });
  });
});
