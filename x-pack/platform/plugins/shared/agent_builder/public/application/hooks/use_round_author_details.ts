/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  getRoundAuthorHeaderName,
  isUserProfileAuthor,
  type RoundAuthor,
} from '../components/conversations/conversation_rounds/round_author';
import { useUserProfiles } from './use_user_profiles';

interface UseRoundAuthorDetailsArgs {
  agent?: AgentDefinition;
  author?: RoundAuthor;
  origin?: ConversationRoundOrigin;
}

interface UseRoundAuthorDetailsResult {
  authorProfile?: UserProfileWithAvatar;
  name?: string;
}

export const useRoundAuthorDetails = ({
  agent,
  author,
  origin,
}: UseRoundAuthorDetailsArgs): UseRoundAuthorDetailsResult => {
  const isAgent = Boolean(agent);
  const hasUserProfileAuthor = isUserProfileAuthor(author);
  const shouldResolveAuthorProfile =
    !isAgent && !hasUserProfileAuthor && !origin && Boolean(author?.id);
  const { data: authorProfiles = [] } = useUserProfiles({
    uids: !hasUserProfileAuthor && author?.id ? [author.id] : [],
    enabled: shouldResolveAuthorProfile,
  });
  const authorProfile = hasUserProfileAuthor ? author : authorProfiles[0];
  const name = getRoundAuthorHeaderName({ agent, author, authorProfile });

  return { authorProfile, name };
};
