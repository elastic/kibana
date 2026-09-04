/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationContext } from './conversation_context';
import { PinnedConversationProvider } from './embeddable_conversations_provider';

const mockUseEffectiveSpaceDefaultAgent = jest.fn();
jest.mock('../../hooks/use_space_default_agent', () => ({
  useEffectiveSpaceDefaultAgent: () => mockUseEffectiveSpaceDefaultAgent(),
}));
// Rendered by the component but irrelevant here (it has its own dependencies).
jest.mock('./conversation_change_notifier', () => ({ ConversationChangeNotifier: () => null }));
// Render the spinner as a marker so we can assert the isReady gate.
jest.mock('../../components/redirects/redirect_loading', () => ({
  RedirectLoading: () => <div>loading-spinner</div>,
}));

const AgentIdConsumer = () => {
  const ctx = useContext(ConversationContext);
  return <div>{`agent:${ctx?.agentId}`}</div>;
};

// Minimal base context value; only `agentId` matters for these assertions.
const baseValue = { agentId: 'elastic-ai-agent' } as NonNullable<
  React.ContextType<typeof ConversationContext>
>;

describe('PinnedConversationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins a restricted user to the effective space default agent', () => {
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isRestricted: true,
      isReady: true,
    });

    render(
      <PinnedConversationProvider baseValue={baseValue}>
        <AgentIdConsumer />
      </PinnedConversationProvider>
    );

    expect(screen.getByText('agent:siemens-agent')).toBeInTheDocument();
  });

  it('leaves the base agent for admins / unconfigured spaces', () => {
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: 'siemens-agent',
      isRestricted: false,
      isReady: true,
    });

    render(
      <PinnedConversationProvider baseValue={baseValue}>
        <AgentIdConsumer />
      </PinnedConversationProvider>
    );

    expect(screen.getByText('agent:elastic-ai-agent')).toBeInTheDocument();
  });

  it('withholds the chat (spinner) until the effective default is ready', () => {
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: false,
    });

    render(
      <PinnedConversationProvider baseValue={baseValue}>
        <AgentIdConsumer />
      </PinnedConversationProvider>
    );

    expect(screen.getByText('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText(/^agent:/)).not.toBeInTheDocument();
  });
});
