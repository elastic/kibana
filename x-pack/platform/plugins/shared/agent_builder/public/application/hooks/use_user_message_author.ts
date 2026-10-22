/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConversationRoundAuthorDisplayName,
  type ConversationRoundAuthor,
  type ConversationRoundOrigin,
} from '@kbn/agent-builder-common';
import { getUserDisplayName, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { resolveServiceAccountDisplayName } from '../../service_account_display_name';
import { useCurrentUser } from './use_current_user';
import { useUserProfiles } from './use_user_profiles';

interface UseUserMessageAuthorArgs {
  author?: ConversationRoundAuthor;
  origin?: ConversationRoundOrigin;
  isPendingCurrentRound: boolean;
}

export interface UserMessageAuthor {
  profile?: UserProfileWithAvatar;
  name?: string;
  isCurrentUser: boolean;
  /** True when the stored author is a service account, so the header can say so. */
  isServiceAccount: boolean;
}

/**
 * Resolves how to display the author of a user message, whether they are a Kibana user, a user
 * from an external system such as Slack, or the current user on a message that is not persisted yet.
 */
export const useUserMessageAuthor = ({
  author,
  origin,
  isPendingCurrentRound,
}: UseUserMessageAuthorArgs): UserMessageAuthor => {
  const { currentUser } = useCurrentUser();
  const isServiceAccount = author?.type === 'service_account';

  // Authors from an external system are identified by that system, not by a Kibana profile uid.
  // A service account id is not a user profile either.
  const kibanaAuthorId = origin || isServiceAccount ? undefined : author?.id;
  const { data: authorProfiles = [] } = useUserProfiles({
    uids: kibanaAuthorId ? [kibanaAuthorId] : [],
  });

  let profile: UserProfileWithAvatar | undefined;

  if (author && !isServiceAccount) {
    profile = authorProfiles[0];
  } else if (!author && isPendingCurrentRound) {
    // A message that is not persisted yet has no author attribution, so it belongs to the current user.
    profile = currentUser ?? undefined;
  }

  const authorId = author?.id ?? profile?.uid;
  const serviceAccountName =
    author && isServiceAccount && !author.full_name
      ? resolveServiceAccountDisplayName(author)
      : undefined;

  return {
    profile,
    name: profile
      ? getUserDisplayName(profile.user)
      : serviceAccountName ?? getConversationRoundAuthorDisplayName(author),
    isCurrentUser: !isServiceAccount && Boolean(authorId) && authorId === currentUser?.uid,
    isServiceAccount,
  };
};
