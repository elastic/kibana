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

/** An access-control entry without the server-assigned `added_at` timestamp, for write operations. */
export type ConversationAccessControlEntryInput = Omit<ConversationAccessControlEntry, 'added_at'>;

/** Access-control shape for write operations. `entries` is optional and defaults to `[]` server-side. */
export interface ConversationAccessControlInput {
  access_mode: ConversationAccessControlMode;
  entries?: ConversationAccessControlEntryInput[];
}

export const CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES = 100;

export const CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH = 1024;

const CONVERSATION_ACCESS_CONTROL_ROLES: readonly string[] = Object.values(
  ConversationAccessControlRole
);

export const isConversationAccessControlRole = (
  value: unknown
): value is ConversationAccessControlRole =>
  typeof value === 'string' && CONVERSATION_ACCESS_CONTROL_ROLES.includes(value);
