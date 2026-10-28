/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  isPublicConversation,
  isSharedConversation,
  isUserProfileId,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { useDebouncedValue } from '@kbn/react-hooks';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useAgentBuilderAgentById } from '../../../../../../../hooks/agents/use_agent_by_id';
import { useCurrentUser } from '../../../../../../../hooks/use_current_user';
import { useAgentId, useConversation } from '../../../../../../../hooks/use_conversation';
import { useSuggestUsers } from '../../../../../../../hooks/use_suggest_users';
import { useUserProfiles } from '../../../../../../../hooks/use_user_profiles';
import type { MentionCandidate, UserMentionCandidate } from './types';

const SEARCH_DEBOUNCE_MS = 200;

const getChatPersonIds = (conversation: Conversation | undefined, isPublic: boolean): string[] => {
  if (!conversation) {
    return [];
  }
  const ids = [conversation.user.id];
  if (isPublic) {
    // Authors from an external system are identified by that system, not by a profile uid.
    conversation.rounds.forEach(({ author, origin }) => {
      if (author && !origin) {
        ids.push(author.id);
      }
    });
  } else {
    normalizeConversationAccessControl(conversation.access_control).entries.forEach(({ id }) =>
      ids.push(id)
    );
  }
  return Array.from(new Set(ids.filter(isUserProfileId)));
};

const profileMatchesQuery = ({ user }: UserProfileWithAvatar, lowerQuery: string): boolean =>
  [getUserDisplayName(user), user.full_name, user.username, user.email].some((value) =>
    value?.toLowerCase().includes(lowerQuery)
  );

const toUserCandidate = (profile: UserProfileWithAvatar): UserMentionCandidate => ({
  kind: 'user',
  id: profile.uid,
  name: getUserDisplayName(profile.user),
  profile,
});

const byName = (first: UserMentionCandidate, second: UserMentionCandidate): number =>
  first.name.localeCompare(second.name);

/**
 * Who can be mentioned in the current chat, in menu order: the chat's agent, the people in this
 * chat, then (public chats only) everyone else in the space. Nobody is listed twice, and the
 * current user is never listed.
 */
export const useMentionCandidates = (
  query: string
): { candidates: MentionCandidate[]; isLoading: boolean } => {
  const { conversation } = useConversation();
  const agentId = useAgentId();
  const { agent } = useAgentBuilderAgentById(agentId);
  const { currentUser } = useCurrentUser();

  const isShared = isSharedConversation(conversation?.access_control);
  const isPublic = isPublicConversation(conversation?.access_control);

  const chatPersonIds = useMemo(
    () => getChatPersonIds(conversation, isPublic),
    [conversation, isPublic]
  );
  const { data: chatProfiles, isInitialLoading: isLoadingChatProfiles } = useUserProfiles({
    uids: chatPersonIds,
    enabled: isShared,
  });

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const isSearchPending = Boolean(query) && query !== debouncedQuery;
  const { data: suggestedProfiles, isFetching: isFetchingSuggestions } = useSuggestUsers(
    query ? debouncedQuery : '',
    { enabled: isPublic }
  );

  const candidates = useMemo(() => {
    if (!isShared) {
      return [];
    }
    const lowerQuery = query.toLowerCase();
    const result: MentionCandidate[] = [];

    // The agent row only shows when it matches, else Enter on a name search would pick the agent
    if (agent && (!lowerQuery || agent.name.toLowerCase().includes(lowerQuery))) {
      result.push({ kind: 'agent', id: agent.id, name: agent.name, agent });
    }

    const listedUids = new Set<string>(currentUser ? [currentUser.uid] : []);
    const addUsers = (users: UserMentionCandidate[]) => {
      users.forEach((user) => {
        if (!listedUids.has(user.id)) {
          listedUids.add(user.id);
          result.push(user);
        }
      });
    };

    addUsers(
      (chatProfiles ?? [])
        .filter((profile) => profileMatchesQuery(profile, lowerQuery))
        .map(toUserCandidate)
        .sort(byName)
    );
    if (isPublic) {
      addUsers((suggestedProfiles ?? []).map(toUserCandidate));
    }
    return result;
  }, [isShared, isPublic, query, agent, currentUser, chatProfiles, suggestedProfiles]);

  const isLoading =
    isShared && (isLoadingChatProfiles || (isPublic && (isSearchPending || isFetchingSuggestions)));

  return { candidates, isLoading };
};
