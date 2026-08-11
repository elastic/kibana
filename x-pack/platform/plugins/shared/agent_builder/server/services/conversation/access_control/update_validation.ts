/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  ConversationAccessControlMode,
  isConversationAccessControlRole,
  type ConversationAccessControlEntry,
} from '@kbn/agent-builder-common';

export type ConversationAccessControlEntryInput = Omit<ConversationAccessControlEntry, 'added_at'>;

export type NormalizeAccessControlUpdateResult =
  | { error: string; entries?: undefined }
  | { error?: undefined; entries: ConversationAccessControlEntryInput[] };

/**
 * Validates and normalizes the entries of an access-control update: malformed entries are
 * rejected, while duplicates and an entry naming the owner are dropped rather than refused,
 * since neither is a security boundary and the sharing UI can send either.
 */
export const normalizeAccessControlUpdate = ({
  accessMode,
  entries,
  ownerId,
}: {
  accessMode: ConversationAccessControlMode;
  entries: ConversationAccessControlEntryInput[];
  ownerId: string | undefined;
}): NormalizeAccessControlUpdateResult => {
  if (!Array.isArray(entries)) {
    return { error: 'ACL entries must be an array' };
  }

  // Entries are additive to private mode; a public conversation is already open to everyone
  // with agent access, so per-user grants would be meaningless and are rejected outright.
  if (accessMode === ConversationAccessControlMode.Public && entries.length > 0) {
    return { error: 'ACL entries are not supported when access_mode is "public"' };
  }

  if (entries.length > CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES) {
    return { error: `ACL entries exceed maximum of ${CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES}` };
  }

  const seen = new Set<string>();
  const normalized: ConversationAccessControlEntryInput[] = [];

  for (const entry of entries) {
    // V1: only user-type entries are supported. Role-type grants are planned for V2.
    if (!entry || entry.type !== 'user') {
      return { error: 'Each ACL entry requires a type of "user"' };
    }

    if (typeof entry.id !== 'string' || entry.id.length === 0) {
      return { error: 'Each ACL entry requires a non-empty id' };
    }

    if (entry.id.length > CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH) {
      return {
        error: `ACL principal id exceeds maximum length of ${CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH}`,
      };
    }

    if (!isConversationAccessControlRole(entry.role)) {
      return { error: `Unknown ACL role: ${String(entry.role)}` };
    }

    // Owner access is keyed off document ownership, so an owner entry would be inert.
    if (ownerId !== undefined && entry.id === ownerId) {
      continue;
    }

    const key = `${entry.type}:${entry.id}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({ type: entry.type, id: entry.id, role: entry.role });
  }

  return { entries: normalized };
};
