/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REALM_USER_ID_PREFIX } from '@kbn/agent-builder-common';

/**
 * Who is trying to attach an investigation. `profileUid` is the stable id stored
 * on the conversation owner and on ACL entries: a user-profile uid when one was
 * available, otherwise the realm id conversations record.
 */
export interface EscalationLinkActor {
  profileUid?: string;
  username?: string;
}

export interface EscalationLinkSubject {
  user?: { id?: string; username?: string };
  access_control?: {
    entries?: ReadonlyArray<{ type: string; id: string }>;
  };
}

/**
 * Linking copies investigation attachments onto the escalation, so it is limited
 * to the owner and listed participants. Being able to read a public escalation
 * is not enough.
 */
export const canLinkEscalation = (
  escalation: EscalationLinkSubject,
  actor: EscalationLinkActor
): boolean => {
  const ownerId = escalation.user?.id;
  const actorId = actor.profileUid;

  if (ownerId !== undefined && actorId !== undefined && ownerId === actorId) {
    return true;
  }

  // Same fallback as conversation ownership: username only when the conversation
  // has no profile uid at all.
  if (
    ownerId === undefined &&
    actor.username !== undefined &&
    escalation.user?.username === actor.username
  ) {
    return true;
  }

  if (actorId === undefined || escalation.access_control?.entries === undefined) {
    return false;
  }

  return escalation.access_control.entries.some(
    (entry) => entry.type === 'user' && entry.id === actorId
  );
};

/** The authenticated user fields that identify a conversation principal. */
export interface ConversationAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

/**
 * The id Agent Builder stores on a conversation. A profile uid wins; otherwise
 * the realm id, so a native user matches `user.id` and ACL entries.
 */
export const conversationPrincipal = (
  user: ConversationAuthUser | undefined
): EscalationLinkActor => {
  if (!user?.username) {
    return {};
  }

  if (user.profile_uid) {
    return { profileUid: user.profile_uid, username: user.username };
  }

  // The server fills `profile_uid` from the API key before calling this. A key whose
  // creator has no profile must not fall through to a realm id: that is not the id
  // Agent Builder stored.
  if (user.authentication_type === 'api_key') {
    return { username: user.username };
  }

  const realmType = user.authentication_realm?.type;
  const realmName = user.authentication_realm?.name;
  if (!realmType || !realmName) {
    return { username: user.username };
  }

  return {
    profileUid: `${REALM_USER_ID_PREFIX}${JSON.stringify([realmType, realmName, user.username])}`,
    username: user.username,
  };
};
