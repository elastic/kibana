/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ConversationsService } from '../../../services/conversations';
import { queryKeys } from '../../query_keys';
import { createNewConversation } from '../../utils/new_conversation';
import { createConversationActions } from './use_conversation_actions';

const conversationId = 'conv-1';

const buildActions = () => {
  const queryClient = new QueryClient();
  const conversationsService = {} as unknown as ConversationsService;
  const actions = createConversationActions({
    conversationId,
    queryClient,
    conversationsService,
  });
  return { queryClient, actions };
};

const attachmentFixture = (current: number): VersionedAttachment[] => [
  {
    id: 'att-1',
    type: 'dashboard',
    current_version: current,
    versions: Array.from({ length: current }, (_, i) => ({
      version: i + 1,
      data: { revision: i + 1 },
      created_at: `2024-01-0${i + 1}T00:00:00.000Z`,
      content_hash: `hash-${i + 1}`,
    })),
  },
];

describe('createConversationActions.setAttachments', () => {
  it('writes the attachments array onto the cached conversation', () => {
    const { queryClient, actions } = buildActions();
    const queryKey = queryKeys.conversations.byId(conversationId);
    queryClient.setQueryData<Conversation>(
      queryKey,
      createNewConversation({ id: conversationId, agentId: 'agent-1' })
    );

    const fresh = attachmentFixture(2);
    actions.setAttachments({ attachments: fresh });

    const conversation = queryClient.getQueryData<Conversation>(queryKey);
    expect(conversation?.attachments).toEqual(fresh);
  });

  it('replaces a previous attachments array (does not merge)', () => {
    const { queryClient, actions } = buildActions();
    const queryKey = queryKeys.conversations.byId(conversationId);
    queryClient.setQueryData<Conversation>(queryKey, {
      ...createNewConversation({ id: conversationId, agentId: 'agent-1' }),
      attachments: attachmentFixture(1),
    });

    const fresh = attachmentFixture(2);
    actions.setAttachments({ attachments: fresh });

    const conversation = queryClient.getQueryData<Conversation>(queryKey);
    expect(conversation?.attachments).toEqual(fresh);
    expect(conversation?.attachments?.[0].current_version).toBe(2);
  });

  it('no-ops when the conversation is not yet in the cache', () => {
    const { queryClient, actions } = buildActions();
    const queryKey = queryKeys.conversations.byId(conversationId);

    actions.setAttachments({ attachments: attachmentFixture(2) });

    expect(queryClient.getQueryData<Conversation>(queryKey)).toBeUndefined();
  });
});
