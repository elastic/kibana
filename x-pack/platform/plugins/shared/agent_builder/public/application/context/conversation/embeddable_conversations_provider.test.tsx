/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient } from '@kbn/react-query';
import type { AgentBuilderInternalService } from '../../../services';
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

describe('EmbeddableConversationsProvider - new functionality', () => {
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
          get: jest.fn().mockResolvedValue({ id: 'conversation-1', ...conversationOverrides }),
        },
        attachmentsService: {
          updateOrigin: jest.fn().mockResolvedValue({ success: true }),
        },
      } as unknown as AgentBuilderInternalService,
    };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('onConversationChange callback', () => {
    it('fires with undefined id for new conversations', async () => {
      const props = createProps();
      const onConversationChange = jest.fn();

      render(
        <EmbeddableConversationsProvider
          {...props}
          newConversation
          onConversationChange={onConversationChange}
        >
          <div />
        </EmbeddableConversationsProvider>
      );

      await waitFor(() =>
        expect(onConversationChange).toHaveBeenCalledWith({
          id: undefined,
        })
      );
    });

    it('fires with conversation id and attachments when switching to existing conversation', async () => {
      const mockAttachments = [
        { id: 'attachment-1', type: 'dashboard', versions: [], current_version: 1 },
      ];
      const props = createProps({ attachments: mockAttachments });
      const onConversationChange = jest.fn();
      const onReady = jest.fn();

      render(
        <EmbeddableConversationsProvider
          {...props}
          newConversation
          onConversationChange={onConversationChange}
        >
          <ContextProbe onReady={onReady} />
        </EmbeddableConversationsProvider>
      );

      await waitFor(() => expect(onReady).toHaveBeenCalled());

      const latestContext = onReady.mock.calls.at(-1)?.[0];

      act(() => {
        latestContext.setConversationId?.('conversation-1');
      });

      await waitFor(() =>
        expect(onConversationChange).toHaveBeenCalledWith({
          id: 'conversation-1',
          attachments: mockAttachments,
        })
      );
    });

    it('fires with conversation id but no attachments when fetch fails', async () => {
      const props = createProps();
      // Use a 404 so useConversation does not retry (retry is disabled for 404).
      props.services.conversationsService.get = jest
        .fn()
        .mockRejectedValue({ response: { status: 404 } });

      const onConversationChange = jest.fn();
      const onReady = jest.fn();

      render(
        <EmbeddableConversationsProvider
          {...props}
          newConversation
          onConversationChange={onConversationChange}
        >
          <ContextProbe onReady={onReady} />
        </EmbeddableConversationsProvider>
      );

      await waitFor(() => expect(onReady).toHaveBeenCalled());

      const latestContext = onReady.mock.calls.at(-1)?.[0];

      act(() => {
        latestContext.setConversationId?.('conversation-1');
      });

      await waitFor(() =>
        expect(onConversationChange).toHaveBeenCalledWith({
          id: 'conversation-1',
        })
      );
    });

    it('does not fire when callback is not provided', async () => {
      const props = createProps();
      const onReady = jest.fn();

      render(
        <EmbeddableConversationsProvider {...props} newConversation>
          <ContextProbe onReady={onReady} />
        </EmbeddableConversationsProvider>
      );

      await waitFor(() => expect(onReady).toHaveBeenCalled());

      expect(onReady).toHaveBeenCalled();
    });
  });

  describe('registered callbacks', () => {
    it('invalidateConversation calls the conversation actions invalidate method', async () => {
      const props = createProps();
      const onReady = jest.fn();
      const invalidateQueries = jest
        .spyOn(QueryClient.prototype, 'invalidateQueries')
        .mockResolvedValue();

      render(
        <EmbeddableConversationsProvider {...props} newConversation>
          <ContextProbe onReady={onReady} />
        </EmbeddableConversationsProvider>
      );

      await waitFor(() => expect(props.onRegisterCallbacks).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(onReady).toHaveBeenCalled());

      const callbacks = props.onRegisterCallbacks.mock.calls[0][0];

      await waitFor(() => {
        callbacks.invalidateConversation();
        expect(invalidateQueries).toHaveBeenCalled();
      });
    });
  });
});
