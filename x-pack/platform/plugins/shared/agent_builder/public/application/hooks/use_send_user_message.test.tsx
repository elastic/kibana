/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { queryKeys } from '../query_keys';
import { ChatTriggerMode } from '../../../common/http_api/chat';
import { useSendUserMessage } from './use_send_user_message';

jest.mock('./use_agent_builder_service');
jest.mock('../context/conversation/use_conversation_id');
jest.mock('../context/conversation/conversation_context');

const { useAgentBuilderServices } = jest.requireMock('./use_agent_builder_service');
const { useConversationId } = jest.requireMock('../context/conversation/use_conversation_id');
const { useConversationContext } = jest.requireMock('../context/conversation/conversation_context');

const conversationId = 'conv-1';
const updatedConversation = { id: conversationId, events: [{ id: 'evt-1', type: 'user_message' }] };

const sentAttachments = [
  {
    type: 'group',
    id: 'group-1',
    label: 'Group',
    items: [{ id: 'a-1', type: AttachmentType.text, data: { content: 'hello' } }],
  },
];

describe('useSendUserMessage', () => {
  let queryClient: QueryClient;
  let sendUserMessage: jest.Mock;
  let removeAttachments: jest.Mock;
  let resetAttachments: jest.Mock;

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient();
    sendUserMessage = jest.fn().mockResolvedValue(updatedConversation);
    removeAttachments = jest.fn();
    resetAttachments = jest.fn();
    useAgentBuilderServices.mockReturnValue({ chatService: { sendUserMessage } });
    useConversationId.mockReturnValue(conversationId);
    useConversationContext.mockReturnValue({
      attachments: sentAttachments,
      removeAttachments,
      resetAttachments,
    });
  });

  it('posts the message with flattened attachments and replaces the cached conversation', async () => {
    queryClient.setQueryData(queryKeys.conversations.byId(conversationId), {
      id: conversationId,
      events: [],
    });
    const { result } = renderHook(() => useSendUserMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('hello group');
    });

    expect(sendUserMessage).toHaveBeenCalledWith({
      conversationId,
      input: 'hello group',
      triggerMode: ChatTriggerMode.Never,
      attachments: [
        {
          id: 'a-1',
          type: AttachmentType.text,
          data: { content: 'hello' },
          group_id: 'group-1',
          description: 'Group',
        },
      ],
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.conversations.byId(conversationId))).toEqual(
        updatedConversation
      )
    );
    expect(removeAttachments).toHaveBeenCalledWith(sentAttachments);
    expect(resetAttachments).not.toHaveBeenCalled();
  });

  it('sends a pasted PDF as its file id only, for the server to read', async () => {
    const pdf = { type: AttachmentType.binary, origin: 'file-1', description: 'invoice.pdf' };
    useConversationContext.mockReturnValue({ attachments: [pdf], removeAttachments });
    const { result } = renderHook(() => useSendUserMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('hello');
    });

    expect(sendUserMessage).toHaveBeenCalledWith(expect.objectContaining({ attachments: [pdf] }));
    expect(removeAttachments).toHaveBeenCalledWith([pdf]);
  });

  it('rejects without a conversation id and leaves the cache alone', async () => {
    useConversationId.mockReturnValue(undefined);
    const { result } = renderHook(() => useSendUserMessage(), { wrapper });

    await expect(result.current.mutateAsync('hello')).rejects.toThrow('conversation id');

    expect(sendUserMessage).not.toHaveBeenCalled();
    expect(removeAttachments).not.toHaveBeenCalled();
  });
});
