/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import { sendGetActionStatus } from '../../../../../../hooks/use_request/agents';

import { useScheduledAgentActions } from './use_scheduled_agent_actions';

jest.mock('../../../../../../hooks/use_request/agents', () => ({
  sendGetActionStatus: jest.fn(),
}));

const mockSendGetActionStatus = sendGetActionStatus as jest.Mock;

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

function makeAction(overrides: object = {}) {
  return {
    actionId: 'action-1',
    type: 'UNENROLL',
    status: 'IN_PROGRESS',
    startTime: FUTURE,
    nbAgentsActioned: 5,
    nbAgentsAck: 2,
    creationTime: new Date().toISOString(),
    nbAgentsActionCreated: 5,
    nbAgentsFailed: 0,
    ...overrides,
  };
}

describe('useScheduledAgentActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always calls sendGetActionStatus with scheduledOnly:true and never with latest', async () => {
    mockSendGetActionStatus.mockResolvedValue({ data: { items: [] } });

    const renderer = createFleetTestRendererMock();
    renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(mockSendGetActionStatus).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledOnly: true })
      );
      expect(mockSendGetActionStatus).not.toHaveBeenCalledWith(
        expect.objectContaining({ latest: expect.anything() })
      );
    });
  });

  it('returns empty state when no actions are returned', async () => {
    mockSendGetActionStatus.mockResolvedValue({ data: { items: [] } });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(result.current.scheduledActions).toEqual([]);
      expect(result.current.nextStartTime).toBeUndefined();
      expect(result.current.totalAgentsScheduled).toBe(0);
    });
  });

  it('filters out actions whose startTime is in the past', async () => {
    mockSendGetActionStatus.mockResolvedValue({
      data: { items: [makeAction({ startTime: PAST })] },
    });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(result.current.scheduledActions).toEqual([]);
    });
  });

  it('filters out non-IN_PROGRESS actions', async () => {
    mockSendGetActionStatus.mockResolvedValue({
      data: { items: [makeAction({ status: 'CANCELLED' })] },
    });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(result.current.scheduledActions).toEqual([]);
    });
  });

  it('filters by types option (default UNENROLL only)', async () => {
    mockSendGetActionStatus.mockResolvedValue({
      data: { items: [makeAction({ type: 'UPGRADE' })] },
    });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(result.current.scheduledActions).toEqual([]);
    });
  });

  it('includes action when types contains its type', async () => {
    const action = makeAction({ type: 'UPGRADE' });
    mockSendGetActionStatus.mockResolvedValue({ data: { items: [action] } });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      useScheduledAgentActions({ types: ['UPGRADE'] })
    );

    await waitFor(() => {
      expect(result.current.scheduledActions).toHaveLength(1);
    });
  });

  it('computes nextStartTime as the earliest startTime', async () => {
    const earlier = FUTURE;
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    mockSendGetActionStatus.mockResolvedValue({
      data: {
        items: [
          makeAction({ actionId: 'a1', startTime: later }),
          makeAction({ actionId: 'a2', startTime: earlier }),
        ],
      },
    });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(result.current.nextStartTime).toBe(earlier);
    });
  });

  it('sums totalAgentsScheduled across actions', async () => {
    mockSendGetActionStatus.mockResolvedValue({
      data: {
        items: [
          makeAction({ actionId: 'a1', nbAgentsActioned: 5, nbAgentsAck: 2 }), // 3
          makeAction({ actionId: 'a2', nbAgentsActioned: 10, nbAgentsAck: 4 }), // 6
        ],
      },
    });

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduledAgentActions());

    await waitFor(() => {
      expect(result.current.totalAgentsScheduled).toBe(9);
    });
  });
});
