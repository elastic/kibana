/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { buildPolicyBaseIdsWithFallbackKuery } from '../../../../../../common/services/version_specific_policies_utils';
import { sendGetAgents, sendGetPackagePolicies } from '../../../hooks';

import { useLatestFleetServers } from './use_latest_fleet_servers';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  sendGetAgents: jest.fn(),
  sendGetPackagePolicies: jest.fn(),
}));

describe('useLatestFleetServers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(sendGetPackagePolicies).mockResolvedValue({
      data: {
        items: [{ policy_ids: ['fleet-server-policy'] }, { policy_ids: ['fleet-server-policy-2'] }],
      },
    } as any);
    jest.mocked(sendGetAgents).mockResolvedValue({ data: { items: [{ id: 'agent-1' }] } } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('finds the recently enrolled Fleet Servers by their base policy id, so agents on #sentinel are included', async () => {
    const { result } = renderHook(() => useLatestFleetServers());

    await act(async () => {
      jest.advanceTimersByTime(10 * 1000);
    });

    expect(sendGetAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: expect.stringContaining(
          buildPolicyBaseIdsWithFallbackKuery(
            ['fleet-server-policy', 'fleet-server-policy-2'],
            'fleet-agents.policy_base_id',
            'fleet-agents.policy_id'
          )
        ),
      })
    );
    expect(result.current.hasRecentlyEnrolledFleetServers).toBe(true);
  });
});
