/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/observability-ai-assistant-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

export const isConversationOwnedByUser = ({
  conversationId,
  conversationUser,
  currentUser,
}: {
  conversationId?: string;
  conversationUser?: Conversation['user'];
  currentUser: Pick<AuthenticatedUser, 'full_name' | 'username' | 'profile_uid'> | undefined;
}): boolean => {
  if (!conversationId) return true;

  if (!conversationUser || !currentUser) return false;

  return conversationUser.id && currentUser.profile_uid
    ? conversationUser.id === currentUser.profile_uid
    : conversationUser.name === currentUser.username;
};
