/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Conversation, ConversationWithoutRounds, UserIdAndName } from '@kbn/agent-builder-common';
import { canDeleteConversation } from '@kbn/agent-builder-common';
import { useCurrentUser } from './agents/use_current_user';

export const canCurrentUserDeleteConversation = ({
  conversation,
  currentUser,
}: {
  conversation: Pick<Conversation, 'user'> | undefined;
  currentUser: UserIdAndName | null;
}): boolean => {
  if (!conversation || !currentUser) {
    return false;
  }

  return canDeleteConversation({ conversation, user: currentUser });
};

export const useCanDeleteConversation = (
  conversation: Pick<Conversation, 'user'> | ConversationWithoutRounds | undefined
): boolean => {
  const { currentUser } = useCurrentUser();

  return useMemo(
    () => canCurrentUserDeleteConversation({ conversation, currentUser }),
    [conversation, currentUser]
  );
};
