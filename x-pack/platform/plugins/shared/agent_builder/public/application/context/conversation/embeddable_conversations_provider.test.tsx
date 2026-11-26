/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useQueryClient, type QueryClient } from '@kbn/react-query';
import type { EmbeddableConversationCallbacks } from '../../../embeddable/types';
import type { AgentBuilderInternalService } from '../../../services/types';
import { storageKeys } from '../../storage_keys';
import type { refreshListsOnAgentChanges } from '../../utils/refresh_lists_on_agent_changes';
import type { ConversationContext } from './conversation_context';
import { useConversationContext } from './conversation_context';
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
  ConversationStreamService: class ConversationStreamService {
    dispose() {}
  },
}));
const mockUnsubscribeListRefresh = jest.fn();
const mockRefreshListsOnAgentChanges = jest.fn(
  (_params: Parameters<typeof refreshListsOnAgentChanges>[0]) => ({
    unsubscribe: mockUnsubscribeListRefresh,
  })
);
jest.mock('../../utils/refresh_lists_on_agent_changes', () => ({
  refreshListsOnAgentChanges: (...args: Parameters<typeof mockRefreshListsOnAgentChanges>) =>
    mockRefreshListsOnAgentChanges(...args),
}));
const mockNotifyConversationChange = jest.fn();
jest.mock('./conversation_change_notifier', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    ConversationChangeNotifier: ({
      agentId,
      sessionTag,
    }: {
      agentId?: string;
      sessionTag?: string;
    }) => {
      useEffect(() => {
        mockNotifyConversationChange({ agentId, sessionTag });
      }, [agentId, sessionTag]);
      return null;
    },
  };
});
// Render the spinner as a marker so we can assert the isReady gate.
jest.mock('../../components/redirects/redirect_loading', () => ({
  RedirectLoading: () => <div>loading-spinner</div>,
}));

const INITIAL_MESSAGE = 'Suggest an automation for this AI index.';
const AGENT_ID = 'context-engine-setup';
const TAG_A = 'context-engine-ai-index:default:index-a';
const TAG_B = 'context-engine-ai-index:default:index-b';

const AgentIdConsumer = () => {
  const { agentId } = useConversationContext();
  return <div>{`agent:${agentId}`}</div>;
};

const ContextSpy = () => {
  const { conversationId, initialMessage, autoSendInitialMessage, setConversationId } =
    useConversationContext();
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
  children = <ContextSpy />,
  onRegisterCallbacks,
}: {
  sessionTag?: string;
  getConversation?: jest.Mock;
  children?: React.ReactNode;
  onRegisterCallbacks?: (callbacks: EmbeddableConversationCallbacks) => void;
} = {}) => {
  let callbacks: EmbeddableConversationCallbacks | undefined;
  const coreStart = coreMock.createStart();

  const services = {
    agentService: { list: jest.fn().mockResolvedValue([]) },
    conversationsService: { get: getConversation },
    eventsService: {},
    startDependencies: {},
  } as unknown as AgentBuilderInternalService;

  const { unmount } = render(
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
        onRegisterCallbacks?.(registered);
      }}
    >
      {children}
    </EmbeddableConversationsProvider>
  );

  return {
    services,
    unmount,
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

  it('tells the notifier which chat it belongs to', () => {
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: true,
    });

    render(
      <PinnedConversationProvider
        baseValue={{ ...baseValue, sessionTag: 'workflow-editor:a' }}
        agentId="custom-workflow-agent"
      >
        <AgentIdConsumer />
      </PinnedConversationProvider>
    );

    expect(mockNotifyConversationChange).toHaveBeenLastCalledWith({
      agentId: 'custom-workflow-agent',
      sessionTag: 'workflow-editor:a',
    });
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

  it('registers sidebar callbacks before publishing the conversation binding', () => {
    const order: string[] = [];
    mockNotifyConversationChange.mockImplementationOnce(() => {
      order.push('conversation');
    });

    renderEmbeddableProvider({
      onRegisterCallbacks: () => {
        order.push('callbacks');
      },
    });

    expect(order).toEqual(['callbacks', 'conversation']);
  });

  it('publishes the conversation binding under the chat session tag', () => {
    renderEmbeddableProvider({ sessionTag: TAG_B });

    expect(mockNotifyConversationChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionTag: TAG_B })
    );
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

describe('EmbeddableConversationsProvider list refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseEffectiveSpaceDefaultAgent.mockReturnValue({
      effectiveDefaultAgentId: null,
      isRestricted: false,
      isReady: true,
    });
  });

  it("refreshes the lists in the sidebar's own query client until it unmounts", async () => {
    let sidebarQueryClient: QueryClient | undefined;
    const QueryClientSpy = () => {
      sidebarQueryClient = useQueryClient();
      return <ContextSpy />;
    };

    const { services, unmount } = renderEmbeddableProvider({ children: <QueryClientSpy /> });
    expect(await screen.findByText('conversationId:none')).toBeInTheDocument();

    expect(mockRefreshListsOnAgentChanges).toHaveBeenCalledTimes(1);
    expect(mockRefreshListsOnAgentChanges).toHaveBeenCalledWith({
      eventsService: services.eventsService,
      queryClient: sidebarQueryClient,
    });
    expect(mockUnsubscribeListRefresh).not.toHaveBeenCalled();

    unmount();

    expect(mockUnsubscribeListRefresh).toHaveBeenCalledTimes(1);
  });
});
