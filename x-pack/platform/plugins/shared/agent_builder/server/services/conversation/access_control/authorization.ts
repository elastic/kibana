/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import type { ConversationPermissions } from '../../../../common/http_api/conversations';
import type { ConversationProperties } from '../client/storage';

export type ConversationAccess = 'converse' | 'owner' | 'rename' | 'delete' | 'updateAccessControl';

export const isConversationOwner = ({
  conversation,
  user,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
}): boolean => {
  if (conversation.user_id !== undefined && user.id !== undefined) {
    return conversation.user_id === user.id;
  }

  if (conversation.user_id === undefined && user.username !== undefined) {
    return conversation.user_name === user.username;
  }

  return false;
};

const isPublicConversation = ({
  conversation,
}: {
  conversation: ConversationProperties;
}): boolean => {
  return conversation.access_control?.access_mode === ConversationAccessControlMode.Public;
};

export const isConversationMember = ({
  conversation,
  user,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
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
  conversation: ConversationProperties;
  user: UserIdAndName;
}): boolean => {
  if (isConversationOwner({ conversation, user })) {
    return true;
  }

  return isPublicConversation({ conversation }) || isConversationMember({ conversation, user });
};

export const hasConversationOwnerAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
}): boolean => isConversationOwner({ conversation, user });

export const hasConversationRenameAccess = ({
  conversation,
  user,
  isAdmin,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
  isAdmin: boolean;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (isAdmin && isPublicConversation({ conversation }));

export const hasConversationDeleteAccess = ({
  conversation,
  user,
  isAdmin,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
  isAdmin: boolean;
}): boolean =>
  hasConversationOwnerAccess({ conversation, user }) ||
  (isAdmin && isPublicConversation({ conversation }));

export const hasConversationUpdateAccessControlAccess = ({
  conversation,
  user,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
}): boolean => hasConversationOwnerAccess({ conversation, user });

export const getConversationPermissions = ({
  conversation,
  user,
  isAdmin,
}: {
  conversation: ConversationProperties;
  user: UserIdAndName;
  isAdmin: boolean;
}): ConversationPermissions => ({
  rename: hasConversationRenameAccess({ conversation, user, isAdmin }),
  delete: hasConversationDeleteAccess({ conversation, user, isAdmin }),
  update_access_control: hasConversationUpdateAccessControlAccess({ conversation, user }),
});
