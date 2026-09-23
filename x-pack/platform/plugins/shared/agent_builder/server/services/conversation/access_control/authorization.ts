/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds, CurrentUser } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';

export type ConversationAccess = 'converse' | 'owner' | 'rename' | 'delete' | 'updateAccessControl';

interface ConversationOwner {
  userId?: string;
  username: string;
}

export const isConversationOwner = ({
  owner,
  user,
}: {
  owner: ConversationOwner;
  user: CurrentUser;
}): boolean => {
  if (owner.userId !== undefined && user.id !== undefined) {
    return owner.userId === user.id;
  }

  if (owner.userId === undefined && user.username !== undefined) {
    return owner.username === user.username;
  }

  return false;
};

const isPublicConversation = ({
  conversation,
}: {
  conversation: ConversationWithoutRounds;
}): boolean => {
  return conversation.access_control?.access_mode === ConversationAccessControlMode.Public;
};

export const isConversationMember = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean => {
  if (user.id === undefined || conversation.access_control?.entries === undefined) {
    return false;
  }

  return conversation.access_control.entries.some(
    (entry) => entry.type === 'user' && entry.id === user.id
  );
};

export const hasConversationConverseAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean => {
  if (
    isConversationOwner({
      owner: { userId: conversation.user.id, username: conversation.user.username },
      user,
    })
  ) {
    return true;
  }

  return isPublicConversation({ conversation }) || isConversationMember({ conversation, user });
};

export const hasConversationOwnerAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean =>
  isConversationOwner({
    owner: { userId: conversation.user.id, username: conversation.user.username },
    user,
  });

export const hasConversationRenameAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (user.isAdmin && isPublicConversation({ conversation }));

export const hasConversationDeleteAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (user.isAdmin && isPublicConversation({ conversation }));

export const hasConversationUpdateAccessControlAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean => hasConversationOwnerAccess({ conversation, user });
