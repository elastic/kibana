/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds, CurrentUser } from '@kbn/agent-builder-common';
import { isPublicConversation } from '@kbn/agent-builder-common';

export type ConversationAccess =
  | 'converse'
  | 'owner'
  | 'patchMetadata'
  | 'rename'
  | 'delete'
  | 'updateAccessControl';

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

  return (
    isPublicConversation(conversation.access_control) ||
    isConversationMember({ conversation, user })
  );
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

/**
 * Allows the conversation owner, or an admin acting on a public conversation.
 * This is the access level for patching template-controlled metadata fields (e.g. status,
 * severity). It mirrors the rename/delete precedent: ownership check first, admin+public
 * fallback for workflow runs that resume under a different identity after a HITL gate.
 */
export const hasConversationPatchMetadataAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (user.isAdmin && isPublicConversation(conversation.access_control));

export const hasConversationRenameAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (user.isAdmin && isPublicConversation(conversation.access_control));

export const hasConversationDeleteAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (user.isAdmin && isPublicConversation(conversation.access_control));

export const hasConversationUpdateAccessControlAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationWithoutRounds;
  user: CurrentUser;
}): boolean => hasConversationOwnerAccess({ conversation, user });
