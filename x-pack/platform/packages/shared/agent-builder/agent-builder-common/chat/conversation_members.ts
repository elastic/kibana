/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { Conversation, TimelineEvent } from './conversation';
import { isUserMessageEvent } from './conversation';
import { resolveConversationEvents } from './timeline_converters';

export interface ConversationMemberRef {
  uid?: string;
  username: string;
}

export const getConversationMemberKey = (member: ConversationMemberRef): string =>
  member.uid ?? member.username;

const normalizeConversationMemberUsername = (username: string): string => username.toLowerCase();

const isDuplicateConversationMember = (
  member: ConversationMemberRef,
  seenUids: Set<string>,
  seenUsernames: Set<string>
): boolean => {
  const normalizedUsername = normalizeConversationMemberUsername(member.username);

  if (member.uid && seenUids.has(member.uid)) {
    return true;
  }

  return seenUsernames.has(normalizedUsername);
};

const trackConversationMember = (
  member: ConversationMemberRef,
  seenUids: Set<string>,
  seenUsernames: Set<string>
): void => {
  if (member.uid) {
    seenUids.add(member.uid);
  }

  seenUsernames.add(normalizeConversationMemberUsername(member.username));
};

export const userIdAndNameToMemberRef = (user: UserIdAndName): ConversationMemberRef => ({
  uid: user.id,
  username: user.username,
});

/**
 * Distinct users who authored `user_message` events — analogous to Cases participants
 * derived from user actions.
 */
export const getConversationParticipantsFromEvents = (
  events: TimelineEvent[]
): ConversationMemberRef[] => {
  const participants: ConversationMemberRef[] = [];
  const seenUids = new Set<string>();
  const seenUsernames = new Set<string>();

  for (const event of events) {
    if (!isUserMessageEvent(event)) {
      continue;
    }

    const member = userIdAndNameToMemberRef(event.user);
    if (!member.username) {
      continue;
    }

    if (isDuplicateConversationMember(member, seenUids, seenUsernames)) {
      continue;
    }

    trackConversationMember(member, seenUids, seenUsernames);
    participants.push(member);
  }

  return participants;
};

export const mergeConversationMemberRefs = (
  ...memberGroups: ConversationMemberRef[][]
): ConversationMemberRef[] => {
  const merged: ConversationMemberRef[] = [];
  const seenUids = new Set<string>();
  const seenUsernames = new Set<string>();

  for (const group of memberGroups) {
    for (const member of group) {
      if (!member.username) {
        continue;
      }

      if (isDuplicateConversationMember(member, seenUids, seenUsernames)) {
        continue;
      }

      trackConversationMember(member, seenUids, seenUsernames);
      merged.push(member);
    }
  }

  return merged;
};

/**
 * Members shown in the investigation sidebar: distinct event authors plus assignees.
 */
export const getConversationMembers = ({
  conversation,
  assignees = [],
}: {
  conversation: Conversation;
  assignees?: ConversationMemberRef[];
}): ConversationMemberRef[] => {
  const events = resolveConversationEvents(conversation);
  const participants = getConversationParticipantsFromEvents(events);

  return mergeConversationMemberRefs(participants, assignees);
};
