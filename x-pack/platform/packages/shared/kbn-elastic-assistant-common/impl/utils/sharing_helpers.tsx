/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationResponse, User } from '../schemas';

/**
 * Checks if the current user is the owner of the conversation.
 * The owner is defined as the user who created the conversation or, in legacy conversations,
 * the only user in the conversation.
 * @param conversation
 * @param user
 */
export const getIsConversationOwner = (
  // keep type loose for use in both assistant package and security plugins
  conversation: Pick<ConversationResponse, 'createdBy' | 'users' | 'id'> | undefined,
  user?: User
): boolean => {
  const isLoadingState =
    user === undefined || conversation === undefined || conversation?.id === '';
  if (isLoadingState) {
    // some loading state
    return true;
  }
  const conversationUser =
    conversation?.createdBy ??
    // no createdBy property indicates legacy conversation, where only user was the owner
    (conversation?.users.length === 1 ? conversation?.users[0] : {});
  const hasMatchingId = !!conversationUser?.id && !!user?.id && conversationUser?.id === user?.id;
  const hasMatchingName =
    !!conversationUser?.name && !!user?.name && conversationUser?.name === user?.name;
  return hasMatchingId || hasMatchingName;
};
