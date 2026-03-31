/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { EmbeddableConversationsProvider } from './embeddable_conversations_provider';
import { useConversationContext } from './conversation_context';

jest.mock('../send_message/use_send_message_mutation', () => ({
  useSendMessageMutation: () => ({
    sendMessage: jest.fn(),
    isResponseLoading: false,
    pendingMessage: undefined,
    error: undefined,
    errorSteps: [],
    agentReasoning: null,
    retry: jest.fn(),
    canCancel: false,
    cancel: jest.fn(),
    cleanConversation: jest.fn(),
    regenerate: jest.fn(),
    isRegenerating: false,
  }),
}));

jest.mock('../send_message/use_resume_round_mutation', () => ({
  useResumeRoundMutation: () => ({
    resumeRound: jest.fn(),
    isResuming: false,
    agentReasoning: null,
  }),
}));

jest.mock('../../hooks/chat/use_connector_selection', () => ({
  useConnectorSelection: () => ({
    selectedConnector: undefined,
    selectConnector: jest.fn(),
    defaultConnectorId: undefined,
  }),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        tours: {
          isEnabled: () => false,
        },
      },
    },
  }),
}));

describe('EmbeddableConversationsProvider', () => {
  const ContextProbe = ({
    onReady,
  }: {
    onReady: (context: ReturnType<typeof useConversationContext>) => void;
  }) => {
    const context = useConversationContext();

    React.useEffect(() => {
      onReady(context);
    }, [context, onReady]);

    return null;
  };

  const createProps = (conversationOverrides?: object) => {
    const onRegisterCallbacks = jest.fn();

    return {
      ariaLabelledBy: 'agent-builder-sidebar',
      onClose: jest.fn(),
      onRegisterCallbacks,
      coreStart: {} as never,
      services: {
        startDependencies: {},
        conversationsService: {
          get: jest.fn().mockResolvedValue({ id: 'existing-conversation', ...conversationOverrides }),
        },
        attachmentsService: {
          updateOrigin: jest.fn().mockResolvedValue({ success: true }),
        },
      } as never,
    };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('fires the callback immediately when it is added for an existing conversation', async () => {
    const mockAttachments = [
      { id: 'attachment-1', type: 'dashboard', versions: [], current_version: 1 },
    ];
    const props = createProps({ attachments: mockAttachments });
    const onConversationChange = jest.fn();
    const onReady = jest.fn();

    render(
      <EmbeddableConversationsProvider {...props} newConversation>
        <ContextProbe onReady={onReady} />
      </EmbeddableConversationsProvider>
    );

    await waitFor(() => expect(props.onRegisterCallbacks).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onReady).toHaveBeenCalled());

    const callbacks = props.onRegisterCallbacks.mock.calls[0][0];
    const latestContext = onReady.mock.calls.at(-1)?.[0];

    act(() => {
      latestContext.setConversationId?.('existing-conversation');
    });

    await waitFor(() =>
      expect(onReady.mock.calls.at(-1)?.[0].conversationId).toBe('existing-conversation')
    );

    act(() => {
      callbacks.updateProps({
        onConversationChange,
      });
    });

    await waitFor(() =>
      expect(onConversationChange).toHaveBeenCalledWith({
        id: 'existing-conversation',
        attachments: mockAttachments,
      })
    );
  });

  it('fires the callback immediately when it is added for a new conversation', async () => {
    const props = createProps();
    const onConversationChange = jest.fn();

    render(
      <EmbeddableConversationsProvider {...props} newConversation>
        <div />
      </EmbeddableConversationsProvider>
    );

    await waitFor(() => expect(props.onRegisterCallbacks).toHaveBeenCalledTimes(1));

    const callbacks = props.onRegisterCallbacks.mock.calls[0][0];

    act(() => {
      callbacks.updateProps({
        onConversationChange,
      });
    });

    await waitFor(() =>
      expect(onConversationChange).toHaveBeenCalledWith({
        id: undefined,
      })
    );
  });

  it('removes an attachment by id through registered callbacks', async () => {
    const props = createProps();
    const onReady = jest.fn();

    render(
      <EmbeddableConversationsProvider
        {...props}
        attachments={[
          { id: 'dashboard-current-context', type: 'test_type', data: { title: 'Dashboard' } },
          { id: 'keep-me', type: 'test_type', data: { title: 'Keep' } },
        ]}
      >
        <ContextProbe onReady={onReady} />
      </EmbeddableConversationsProvider>
    );

    await waitFor(() => expect(props.onRegisterCallbacks).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onReady.mock.calls.at(-1)?.[0].attachments).toHaveLength(2));

    const callbacks = props.onRegisterCallbacks.mock.calls[0][0];

    act(() => {
      callbacks.removeAttachment('dashboard-current-context');
    });

    await waitFor(() =>
      expect(onReady.mock.calls.at(-1)?.[0].attachments).toEqual([
        { id: 'keep-me', type: 'test_type', data: { title: 'Keep' } },
      ])
    );
  });
});
