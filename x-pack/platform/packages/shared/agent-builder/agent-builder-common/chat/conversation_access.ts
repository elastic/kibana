/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { Conversation } from './conversation';
import type { ConversationChatMode } from './conversation_metadata';
import type { ConversationMode } from './collaboration';

export const isCollaborativeConversation = (
  conversation?: {
    template_snapshot?: { chat_mode?: ConversationChatMode };
    chat_mode?: ConversationChatMode;
    conversation_mode?: ConversationMode;
  }
): boolean => {
  if (!conversation) {
    return false;
  }

  return (
    conversation.template_snapshot?.chat_mode === 'collaborative' ||
    conversation.chat_mode === 'collaborative' ||
    conversation.conversation_mode === 'group'
  );
};

export const isConversationOwner = ({
  owner,
  user,
}: {
  owner: UserIdAndName;
  user: UserIdAndName;
}): boolean => {
  if (user.id && owner.id && owner.id === user.id) {
    return true;
  }

  return owner.username === user.username;
};

/** Delete — creator only for POC (even collaborative investigations). */
export const canDeleteConversation = ({
  conversation,
  user,
}: {
  conversation: Pick<Conversation, 'user'>;
  user: UserIdAndName;
}): boolean => {
  return isConversationOwner({ owner: conversation.user, user });
};
