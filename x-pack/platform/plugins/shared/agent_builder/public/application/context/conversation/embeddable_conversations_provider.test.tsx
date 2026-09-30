/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { coreMock } from '@kbn/core/public/mocks';
import React, { useContext } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { EmbeddableConversationCallbacks } from '../../../embeddable/types';
import type { AgentBuilderInternalService } from '../../../services/types';
import { storageKeys } from '../../storage_keys';
import { ConversationContext } from './conversation_context';
import {
  EmbeddableConversationsProvider,
  PinnedConversationProvider,
} from './embeddable_conversations_provider';

const mockUseEffectiveSpaceDefaultAgent = jest.fn();
jest.mock('../../hooks/use_space_default_agent', () => ({
  useEffectiveSpaceDefaultAgent: () => mockUseEffectiveSpaceDefaultAgent(),
}));
jest.mock('./use_conversation_actions', () => ({
  useConversationActions: () => ({
    invalidateConversation: jest.fn(),
    onExecutionStarted: jest.fn(),
    onExecutionTerminated: jest.fn(),
    refetchConversation: jest.fn(),
    deleteConversation: jest.fn(),
    renameConversation: jest.fn(),
  }),
}));
jest.mock('../streaming/streaming_context', () => ({
  StreamingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../services/events', () => ({
  ConversationStreamService: class ConversationStreamService {},
}));
// Rendered by the component but irrelevant here (it has its own dependencies).
jest.mock('./conversation_change_notifier', () => ({ ConversationChangeNotifier: () => null }));
// Render the spinner as a marker so we can assert the isReady gate.
jest.mock('../../components/redirects/redirect_loading', () => ({
  RedirectLoading: () => <div>loading-spinner</div>,
}));

const INITIAL_MESSAGE = 'Suggest an automation for this AI index.';
const AGENT_ID = 'context-engine-setup';
const TAG_A = 'context-engine-ai-index:default:index-a';
const TAG_B = 'context-engine-ai-index:default:index-b';

const AgentIdConsumer = () => {
  const ctx = useContext(ConversationContext);
  return <div>{`agent:${ctx?.agentId}`}</div>;
};

const ContextSpy = () => {
  const { conversationId, initialMessage, autoSendInitialMessage, setConversationId } =
    useContext(ConversationContext);
  return (
    <>
      <div>{`conversationId:${conversationId ?? 'none'}`}</div>
      <div>{`initialMessage:${initialMessage ?? 'none'}`}</div>
      <div>{`autoSend:${autoSendInitialMessage}`}</div>
      <button type="button" onClick={() => setConversationId?.(undefined)}>
        new-chat
      </button>
    </>
  );
};

const seedPersistedConversation = (sessionTag: string, conversationId: string) => {
  localStorage.setItem(
    storageKeys.getLastConversationKey(sessionTag, AGENT_ID),
    JSON.stringify(conversationId)
  );
};

const renderEmbeddableProvider = ({
  sessionTag = TAG_A,
  getConversation = jest.fn().mockResolvedValue({ id: 'conversation-a' }),
}: {
  sessionTag?: string;
  getConversation?: jest.Mock;
} = {}) => {
  let callbacks: EmbeddableConversationCallbacks | undefined;
  const coreStart = coreMock.createStart();

  const services = {
    agentService: { list: jest.fn().mockResolvedValue([]) },
    conversationsService: { get: getConversation },
    eventsService: {},
    startDependencies: {},
  } as unknown as AgentBuilderInternalService;

  render(
    <EmbeddableConversationsProvider
      coreStart={coreStart}
      services={services}
      ariaLabelledBy="test-chat"
      agentId={AGENT_ID}
      sessionTag={sessionTag}
      initialMessage={INITIAL_MESSAGE}
      autoSendInitialMessage
      onRegisterCallbacks={(registered) => {
        callbacks = registered;
      }}
    >
      <ContextSpy />
    </EmbeddableConversationsProvider>
  );

  return {
    getConversation,
    reopenWith: (nextSessionTag: string) => {
      act(() => {
        callbacks?.updateProps({
          agentId: AGENT_ID,
          sessionTag: nextSessionTag,
          initialMessage: INITIAL_MESSAGE,
          autoSendInitialMessage: true,
        });
      });
    },
  };
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

describe('EmbeddableConversationsProvider initial message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: true,
    });
  });

  it('keeps the initial message when there is no conversation to continue', async () => {
    renderEmbeddableProvider();

    expect(await screen.findByText('conversationId:none')).toBeInTheDocument();
    expect(screen.getByText(`initialMessage:${INITIAL_MESSAGE}`)).toBeInTheDocument();
    expect(screen.getByText('autoSend:true')).toBeInTheDocument();
  });

  it('drops the initial message once a persisted conversation is restored', async () => {
    seedPersistedConversation(TAG_A, 'conversation-a');

    renderEmbeddableProvider();

    expect(await screen.findByText('initialMessage:none')).toBeInTheDocument();
    expect(screen.getByText('conversationId:conversation-a')).toBeInTheDocument();
    expect(screen.getByText('autoSend:false')).toBeInTheDocument();
  });

  it('does not replay the initial message when a restored thread is followed by New chat', async () => {
    seedPersistedConversation(TAG_A, 'conversation-a');

    renderEmbeddableProvider();
    expect(await screen.findByText('initialMessage:none')).toBeInTheDocument();

    fireEvent.click(screen.getByText('new-chat'));

    expect(await screen.findByText('conversationId:none')).toBeInTheDocument();
    expect(screen.getByText('initialMessage:none')).toBeInTheDocument();
    expect(screen.getByText('autoSend:false')).toBeInTheDocument();
  });

  it('drops the initial message when an open sidebar is re-opened on a session with a thread', async () => {
    seedPersistedConversation(TAG_B, 'conversation-b');

    const { reopenWith } = renderEmbeddableProvider({ sessionTag: TAG_A });
    expect(await screen.findByText('conversationId:none')).toBeInTheDocument();

    reopenWith(TAG_B);

    expect(await screen.findByText('initialMessage:none')).toBeInTheDocument();
    expect(screen.getByText('conversationId:conversation-b')).toBeInTheDocument();
  });

  it('keeps the initial message when an open sidebar is re-opened on a session with no thread', async () => {
    const { reopenWith } = renderEmbeddableProvider({ sessionTag: TAG_A });
    expect(await screen.findByText('conversationId:none')).toBeInTheDocument();

    reopenWith(TAG_B);

    expect(await screen.findByText(`initialMessage:${INITIAL_MESSAGE}`)).toBeInTheDocument();
    expect(screen.getByText('conversationId:none')).toBeInTheDocument();
  });
});
