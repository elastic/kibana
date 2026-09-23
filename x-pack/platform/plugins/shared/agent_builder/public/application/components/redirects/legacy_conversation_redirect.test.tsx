/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LegacyConversationRedirect } from './legacy_conversation_redirect';

// --- mocks ---

const mockHistoryReplace = jest.fn();
let mockSearch = '';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ conversationId: 'conv-1' }),
  useHistory: () => ({ replace: mockHistoryReplace }),
  useLocation: () => ({ search: mockSearch }),
  Redirect: ({ to }: { to: string }) => <div>{`redirect:${to}`}</div>,
}));

const mockUseLastAgentId = jest.fn();
jest.mock('../../hooks/use_last_agent_id', () => ({
  useLastAgentId: () => mockUseLastAgentId(),
}));

const mockGetConversation = jest.fn();
jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    conversationsService: { get: mockGetConversation },
  }),
}));

jest.mock('./redirect_loading', () => ({
  RedirectLoading: () => <div>loading</div>,
}));

// useQuery resolves synchronously using its queryFn when enabled.
jest.mock('@kbn/react-query', () => ({
  useQuery: ({ queryFn, enabled }: { queryFn: () => unknown; enabled: boolean }) => {
    if (!enabled) {
      return { data: undefined, isLoading: false, isError: false };
    }
    try {
      const data = queryFn();
      return { data, isLoading: false, isError: false };
    } catch {
      return { data: undefined, isLoading: false, isError: true };
    }
  },
}));

describe('LegacyConversationRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = '';
    mockUseLastAgentId.mockReturnValue({ agentId: 'fallback-agent', isReady: true });
    mockGetConversation.mockReturnValue({ agent_id: 'real-agent' });
  });

  it('preserves the query string when redirecting to the resolved agent', () => {
    mockSearch = '?openConversationDetails=true';

    render(<LegacyConversationRedirect />);

    expect(mockHistoryReplace).toHaveBeenCalledWith({
      pathname: '/agents/real-agent/conversations/conv-1',
      search: '?openConversationDetails=true',
    });
  });

  it('preserves the query string when falling back to the last-known agent on error', () => {
    mockSearch = '?openConversationDetails=true';
    mockGetConversation.mockImplementation(() => {
      throw new Error('not found');
    });

    render(<LegacyConversationRedirect />);

    expect(mockHistoryReplace).toHaveBeenCalledWith({
      pathname: '/agents/fallback-agent/conversations/conv-1',
      search: '?openConversationDetails=true',
    });
  });

  it('redirects without a query string when none is present', () => {
    render(<LegacyConversationRedirect />);

    expect(mockHistoryReplace).toHaveBeenCalledWith({
      pathname: '/agents/real-agent/conversations/conv-1',
      search: '',
    });
  });
});
