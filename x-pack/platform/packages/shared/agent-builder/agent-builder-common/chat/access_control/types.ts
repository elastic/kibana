/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ConversationAccessControlMode {
  Private = 'private',
  Public = 'public',
}

export enum ConversationAccessControlRole {
  Member = 'member',
}

export type ConversationAccessControlPrincipalType = 'user';

export interface ConversationAccessControlEntry {
  type: ConversationAccessControlPrincipalType;
  id: string;
  role: ConversationAccessControlRole;
  added_at: string;
}

export interface ConversationAccessControl {
  access_mode: ConversationAccessControlMode;
  entries: ConversationAccessControlEntry[];
}

export const getDefaultConversationAccessControl = (): ConversationAccessControl => ({
  access_mode: ConversationAccessControlMode.Private,
  entries: [],
});

export const normalizeConversationAccessControl = (
  accessControl: Partial<ConversationAccessControl> | undefined
): ConversationAccessControl => {
  const defaults = getDefaultConversationAccessControl();

  return {
    access_mode: accessControl?.access_mode ?? defaults.access_mode,
    entries: accessControl?.entries ?? defaults.entries,
  };
};

export const CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES = 100;

/**
 * Bounds the stable user id carried by an entry. Entries have no `name`, so the id
 * is the only free-form field and the only one that needs a length cap.
 */
export const CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH = 1024;

const CONVERSATION_ACCESS_CONTROL_ROLES: readonly string[] = Object.values(
  ConversationAccessControlRole
);

/** Narrows untrusted route input to a known conversation access-control role. */
export const isConversationAccessControlRole = (
  value: unknown
): value is ConversationAccessControlRole =>
  typeof value === 'string' && CONVERSATION_ACCESS_CONTROL_ROLES.includes(value);
