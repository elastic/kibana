/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationResponse, User } from '../schemas';
export enum ConversationSharedState {
  // shared with all users in the space
  SHARED = 'shared',
  // restricted to selected users in the space
  RESTRICTED = 'restricted',
  // private, only visible to conversation owner
  PRIVATE = 'private',
}

/**
 * Determines the shared state of a conversation based on the number of users.
 * - If there are no users, the conversation is considered "Shared".
 * - If there is one user, the conversation is "Private".
 * - If there are multiple users, the conversation is "Restricted".
 * @param conversation
 */
export const getConversationSharedState = (
  conversation?: Pick<ConversationResponse, 'id' | 'users'>
): ConversationSharedState => {
  if (!conversation || conversation?.id === '') {
    // while loading or initializing, conversation is not shared
    return ConversationSharedState.PRIVATE;
  }

  const conversationUsers = conversation?.users.length ?? 1;

  switch (conversationUsers) {
    case 0:
      return ConversationSharedState.SHARED;
    case 1:
      // length is 1, default to private
      return ConversationSharedState.PRIVATE;
    default:
      // more than 1 user
      return ConversationSharedState.RESTRICTED;
  }
};

export const getCurrentConversationOwner = (
  conversation?: Pick<ConversationResponse, 'createdBy' | 'users'>
) => {
  return (
    conversation?.createdBy ??
    // no createdBy property indicates legacy conversation, where only user was the owner
    (conversation?.users.length === 1 ? conversation?.users[0] : {})
  );
};
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
  if (
    user === undefined ||
    Object.keys(user).length === 0 ||
    conversation === undefined ||
    conversation?.id === ''
  )
    return true;
  const conversationUser = getCurrentConversationOwner(conversation);
  const hasMatchingId = !!conversationUser?.id && !!user?.id && conversationUser?.id === user?.id;
  const hasMatchingName =
    !!conversationUser?.name && !!user?.name && conversationUser?.name === user?.name;
  return hasMatchingId || hasMatchingName;
};
