/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '../../..';

export enum ConversationSharedState {
  // all users in the space
  Shared = 'shared',
  // selected users in the space
  Restricted = 'restricted',
  // not shared, only visible to conversation owner
  Private = 'private',
}
export const getConversationSharedState = (
  conversation?: Conversation
): ConversationSharedState => {
  if (!conversation || conversation?.id === '') {
    // while loading or initializing, conversation is not shared
    return ConversationSharedState.Private;
  }

  const conversationUsers = conversation?.users.length ?? 1;

  switch (conversationUsers) {
    case 0:
      return ConversationSharedState.Shared;
    case 1:
      // length is 1, default to private
      return ConversationSharedState.Private;
    default:
      // more than 1 user
      return ConversationSharedState.Restricted;
  }
};

export const getSharedIcon = (sharedState: ConversationSharedState): string => {
  switch (sharedState) {
    case ConversationSharedState.Shared:
      return 'globe';
    case ConversationSharedState.Restricted:
      return 'users';
    case ConversationSharedState.Private:
      return 'lock';
    default:
      return 'lock';
  }
};
