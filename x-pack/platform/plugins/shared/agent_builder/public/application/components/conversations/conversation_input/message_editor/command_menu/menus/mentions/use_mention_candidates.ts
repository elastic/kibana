/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  EventActorType,
  isPublicConversation,
  isSharedConversation,
  isUserMessageEvent,
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

const getConversationUserIds = (
  conversation: Conversation | undefined,
  isPublic: boolean
): string[] => {
  if (!conversation) {
    return [];
  }
  const ids = [conversation.user.id];
  if (isPublic) {
    conversation.events?.forEach((event) => {
      if (isUserMessageEvent(event) && event.actor.type === EventActorType.user) {
        ids.push(event.actor.id);
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
 * Who can be mentioned, in menu order:
 * 1. The chat's agent, when the typed text is empty or matches its name.
 * 2. People in the chat, sorted by name:
 *    - private chat: the owner and the people it is shared with
 *    - public chat: the owner and everyone who sent a message
 * 3. Public chat only: anyone else the space user search finds.
 * The current user is never listed. A chat that is not shared lists nobody.
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

  const conversationUserIds = useMemo(
    () => getConversationUserIds(conversation, isPublic),
    [conversation, isPublic]
  );
  const { data: chatProfiles, isInitialLoading: isLoadingChatProfiles } = useUserProfiles({
    uids: conversationUserIds,
    enabled: isShared,
  });

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const isSearchPending = Boolean(query) && query !== debouncedQuery;
  const {
    data: suggestedProfiles,
    isFetching: isFetchingSuggestions,
    isPreviousData: isShowingPreviousSuggestions,
  } = useSuggestUsers(query ? debouncedQuery : '', { enabled: isPublic });
  const areSuggestionsStale = isSearchPending || isShowingPreviousSuggestions;

  const candidates = useMemo(() => {
    if (!isShared) {
      return [];
    }
    const lowerQuery = query.toLowerCase();
    const result: MentionCandidate[] = [];

    // Hide the agent when it does not match, else Enter on a name search picks the agent
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
      const suggestions = (suggestedProfiles ?? []).filter(
        (profile) => !areSuggestionsStale || profileMatchesQuery(profile, lowerQuery)
      );
      addUsers(suggestions.map(toUserCandidate));
    }
    return result;
  }, [
    isShared,
    isPublic,
    query,
    agent,
    currentUser,
    chatProfiles,
    suggestedProfiles,
    areSuggestionsStale,
  ]);

  const isLoading =
    isShared && (isLoadingChatProfiles || (isPublic && (isSearchPending || isFetchingSuggestions)));

  return { candidates, isLoading };
};
