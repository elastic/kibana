/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { queryKeys } from '../query_keys';
import { useConversationStream } from './use_conversation_stream';

jest.mock('../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('../context/conversation/use_conversation_id', () => ({ useConversationId: jest.fn() }));
jest.mock('./use_conversation', () => ({
  useAgentId: () => 'agent-1',
  useConversation: () => ({ conversation: mockConversation }),
}));
jest.mock('./chat/use_connector_selection', () => ({
  useConnectorSelection: () => ({ selectedConnector: 'connector-1' }),
}));
jest.mock('./agents/use_agent_model', () => ({ useAgentModel: () => ({ isLocked: false }) }));
jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: () => ({
    activeStreams: new Map(),
    mutateSendMessage,
    mutateResumeRound: jest.fn(),
    cancelStream: jest.fn(),
  }),
  useStreamRecord: () => ({}),
}));

const mutateSendMessage = jest.fn();
let mockConversation: { attachments?: unknown[] } | undefined;

const pdfInput = { id: 'pdf-1', type: 'pdf', origin: 'file-1', description: 'invoice.pdf' };

describe('useConversationStream sendMessage', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    mockConversation = undefined;
    jest.mocked(useConversationContext).mockReturnValue({
      attachments: [pdfInput],
      resetAttachments: jest.fn(),
    } as never);
  });

  it('sends the attachments of the current conversation with the message', () => {
    jest.mocked(useConversationId).mockReturnValue('conv-1');
    mockConversation = { attachments: [{ id: 'pdf-1' }] };
    const { result } = renderHook(() => useConversationStream(), { wrapper });

    result.current.sendMessage({ message: 'hello', conversationId: 'conv-1' });

    expect(mutateSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        attachments: [pdfInput],
        conversationAttachments: [{ id: 'pdf-1' }],
      })
    );
  });

  it('finds the attachments of a conversation made before Send in the query cache', () => {
    jest.mocked(useConversationId).mockReturnValue(undefined);
    queryClient.setQueryData(queryKeys.conversations.byId('new-conv'), {
      id: 'new-conv',
      attachments: [{ id: 'pdf-1' }],
    });
    const { result } = renderHook(() => useConversationStream(), { wrapper });

    result.current.sendMessage({ message: 'hello', conversationId: 'new-conv' });

    expect(mutateSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'new-conv',
        conversationAttachments: [{ id: 'pdf-1' }],
      })
    );
  });

  it('has no attachments to look up when the new conversation is not cached', () => {
    jest.mocked(useConversationId).mockReturnValue(undefined);
    const { result } = renderHook(() => useConversationStream(), { wrapper });

    result.current.sendMessage({ message: 'hello', conversationId: 'new-conv' });

    expect(mutateSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ conversationAttachments: undefined })
    );
  });
});
