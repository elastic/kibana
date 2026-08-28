/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConversationRoundAuthorDisplayName,
  type ConversationRoundAuthor,
} from '@kbn/agent-builder-common';
import { getUserDisplayName, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { pendingRoundId } from '../../../utils/new_conversation';

export type RoundAuthor = ConversationRoundAuthor | UserProfileWithAvatar;

export const isUserProfileAuthor = (author?: RoundAuthor): author is UserProfileWithAvatar => {
  if (!author) {
    return false;
  }

  return 'uid' in author;
};

export const isPendingCurrentRound = ({
  isCurrentRound,
  roundId,
}: {
  isCurrentRound: boolean;
  roundId: string;
}): boolean => isCurrentRound && roundId === pendingRoundId;

export const getInputAuthor = ({
  author,
  currentUser,
  isPendingCurrentRound: isPendingCurrentRoundValue,
}: {
  author?: RoundAuthor;
  currentUser: UserProfileWithAvatar | null;
  isPendingCurrentRound: boolean;
}): RoundAuthor | undefined => {
  if (author) {
    return author;
  }

  if (!isPendingCurrentRoundValue) {
    return undefined;
  }

  return currentUser ?? undefined;
};

const getAuthorId = (author?: RoundAuthor): string | undefined => {
  if (!author) {
    return undefined;
  }

  if (isUserProfileAuthor(author)) {
    return author.uid;
  }

  return author.id;
};

export const isCurrentUserAuthor = ({
  author,
  currentUser,
}: {
  author?: RoundAuthor;
  currentUser: UserProfileWithAvatar | null;
}): boolean => {
  if (!currentUser) {
    return false;
  }

  const authorId = getAuthorId(author);

  if (!authorId) {
    return false;
  }

  return authorId === currentUser.uid;
};

export const getRoundAuthorHeaderName = ({
  agent,
  author,
  resolvedAuthorProfile,
}: {
  agent?: AgentDefinition;
  author?: RoundAuthor;
  resolvedAuthorProfile?: UserProfileWithAvatar;
}): string | undefined => {
  if (agent) {
    return agent.name;
  }

  if (resolvedAuthorProfile) {
    return getUserDisplayName(resolvedAuthorProfile.user);
  }

  if (isUserProfileAuthor(author)) {
    return undefined;
  }

  return getConversationRoundAuthorDisplayName(author);
};
