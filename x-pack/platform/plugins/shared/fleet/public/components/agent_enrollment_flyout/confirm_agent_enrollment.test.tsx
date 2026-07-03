/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { sendGetAgents } from '../../hooks';

import { usePollingAgentCount } from './confirm_agent_enrollment';

jest.mock('../../hooks', () => ({
  sendGetAgents: jest.fn(),
}));

const mockSendGetAgents = sendGetAgents as jest.Mock;

describe('usePollingAgentCount', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSendGetAgents.mockResolvedValue({ data: { items: [] } });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('accumulates enrolled agent ids over time', async () => {
    mockSendGetAgents.mockResolvedValueOnce({ data: { items: [{ id: 'agent-1' }] } });

    const { result } = renderHook(() =>
      usePollingAgentCount('policy-1', { noLowerTimeLimit: true, pollImmediately: true })
    );

    await act(async () => {});

    expect(result.current.enrolledAgentIds).toEqual(['agent-1']);
  });
});
