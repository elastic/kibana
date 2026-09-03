/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useKibana } from '../../common/lib/kibana';
import { useCanOpenAgentConversation } from './use_can_open_agent_conversation';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mock;
const mockGet = jest.fn();
const mockOpenChat = jest.fn();

const mockServices = ({
  show = true,
  hasOpenChat = true,
}: {
  show?: boolean;
  hasOpenChat?: boolean;
} = {}) => {
  useKibanaMock.mockReturnValue({
    services: {
      http: { get: mockGet },
      agentBuilder: hasOpenChat ? { openChat: mockOpenChat } : undefined,
      application: { capabilities: { agentBuilder: { show } } },
    },
  });
};

describe('useCanOpenAgentConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({});
    mockServices();
  });

  it('returns true when the conversation is readable', async () => {
    const { result } = renderHook(() => useCanOpenAgentConversation('conv-1'), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/api/agent_builder/conversations/conv-1', {
      version: '2023-10-31',
      signal: expect.any(AbortSignal),
    });
  });

  it('returns false when the conversation is not readable', async () => {
    mockGet.mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useCanOpenAgentConversation('conv-1'), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('does not fetch when Agent Builder show is missing', () => {
    mockServices({ show: false });

    const { result } = renderHook(() => useCanOpenAgentConversation('conv-1'), {
      wrapper: TestProviders,
    });

    expect(result.current).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not fetch when openChat is missing', () => {
    mockServices({ hasOpenChat: false });

    const { result } = renderHook(() => useCanOpenAgentConversation('conv-1'), {
      wrapper: TestProviders,
    });

    expect(result.current).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not fetch when a conversation id is missing', () => {
    const { result } = renderHook(() => useCanOpenAgentConversation(), {
      wrapper: TestProviders,
    });

    expect(result.current).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
