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

export type ConversationAccess = 'converse' | 'owner' | 'rename' | 'delete';

/**
 * Checks whether the current user owns the conversation.
 *
 * Username matching is limited to documents that never stored a `user_id`, so those owners are not
 * orphaned. It cannot distinguish same-username principals across authentication realms.
 */
export const isConversationOwner = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name'>;
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
  conversation: Pick<ConversationProperties, 'access_control'>;
}): boolean => {
  return conversation.access_control?.access_mode === ConversationAccessControlMode.Public;
};

/**
 * Checks whether the conversation was shared with the current user.
 *
 * Entries are matched on the stable id the same way `isConversationOwner` matches owners: an entry
 * that stored an id never falls back to the username, so a grant cannot be consumed by a
 * same-username principal from another realm. Legacy documents carry no `entries`.
 */
export const isConversationMember = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'access_control'>;
  user: UserIdAndName;
}): boolean =>
  conversation.access_control?.entries?.some((entry) => {
    if (entry.type !== 'user') {
      return false;
    }

    if (entry.id !== undefined && user.id !== undefined) {
      return entry.id === user.id;
    }

    return entry.id === undefined && !!user.username && entry.name === user.username;
  }) ?? false;

export const hasConversationConverseAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
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
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
  user: UserIdAndName;
}): boolean => isConversationOwner({ conversation, user });

export const hasConversationRenameAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
  user: UserIdAndName;
}): boolean => hasConversationOwnerAccess({ conversation, user });

export const hasConversationDeleteAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
  user: UserIdAndName;
}): boolean => hasConversationOwnerAccess({ conversation, user });

export const hasConversationUpdateAccessControlAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
  user: UserIdAndName;
}): boolean => hasConversationOwnerAccess({ conversation, user });

export const getConversationPermissions = ({
  conversation,
  user,
}: {
  conversation: Pick<ConversationProperties, 'user_id' | 'user_name' | 'access_control'>;
  user: UserIdAndName;
}): ConversationPermissions => ({
  rename: hasConversationRenameAccess({ conversation, user }),
  delete: hasConversationDeleteAccess({ conversation, user }),
  update_access_control: hasConversationUpdateAccessControlAccess({ conversation, user }),
});
