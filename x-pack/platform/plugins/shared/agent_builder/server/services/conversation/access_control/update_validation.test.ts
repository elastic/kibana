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
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { ConversationAccessControlEntryInput } from './update_validation';
import { normalizeAccessControlUpdate } from './update_validation';

const memberEntry = (id: string): ConversationAccessControlEntryInput => ({
  type: 'user',
  id,
  role: ConversationAccessControlRole.Member,
});

const normalize = (
  entries: ConversationAccessControlEntryInput[],
  {
    accessMode = ConversationAccessControlMode.Private,
    ownerId = 'owner',
  }: { accessMode?: ConversationAccessControlMode; ownerId?: string | undefined } = {}
) => normalizeAccessControlUpdate({ accessMode, entries, ownerId });

describe('normalizeAccessControlUpdate', () => {
  it('returns the entries unchanged when the input is valid', () => {
    const entries = [memberEntry('alice'), memberEntry('bob')];

    expect(normalize(entries)).toEqual({ entries });
  });

  it('accepts an empty entries list', () => {
    expect(normalize([])).toEqual({ entries: [] });
  });

  it('accepts an empty entries list with a public access mode', () => {
    expect(normalize([], { accessMode: ConversationAccessControlMode.Public })).toEqual({
      entries: [],
    });
  });

  it('rejects entries when access_mode is public', () => {
    const entries = [memberEntry('alice')];

    expect(normalize(entries, { accessMode: ConversationAccessControlMode.Public })).toEqual({
      error: 'ACL entries are not supported when access_mode is "public"',
    });
  });

  it('rejects more entries than the maximum', () => {
    const entries = Array.from(
      { length: CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES + 1 },
      (_, index) => memberEntry(`user-${index}`)
    );

    expect(normalize(entries)).toEqual({
      error: `ACL entries exceed maximum of ${CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES}`,
    });
  });

  it('rejects a non-user principal type', () => {
    const entries = [
      { ...memberEntry('alice'), type: 'role' },
    ] as unknown as ConversationAccessControlEntryInput[];

    expect(normalize(entries)).toEqual({
      error: 'Each ACL entry requires a type of "user"',
    });
  });

  it('rejects an empty id', () => {
    expect(normalize([memberEntry('')])).toEqual({
      error: 'Each ACL entry requires a non-empty id',
    });
  });

  it('rejects an id longer than the maximum', () => {
    const entries = [
      memberEntry('a'.repeat(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH + 1)),
    ];

    expect(normalize(entries)).toEqual({
      error: `ACL principal id exceeds maximum length of ${CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH}`,
    });
  });

  it('rejects an unknown role', () => {
    const entries = [
      { ...memberEntry('alice'), role: 'manager' },
    ] as unknown as ConversationAccessControlEntryInput[];

    expect(normalize(entries)).toEqual({
      error: 'Unknown ACL role: manager',
    });
  });

  it('drops an entry naming the owner', () => {
    const entries = [memberEntry('owner'), memberEntry('alice')];

    expect(normalize(entries)).toEqual({
      entries: [memberEntry('alice')],
    });
  });

  it('keeps every entry when the conversation has no owner id', () => {
    const entries = [memberEntry('alice'), memberEntry('bob')];

    expect(normalize(entries, { ownerId: undefined })).toEqual({ entries });
  });

  it('rejects repeated ids', () => {
    const entries = [memberEntry('alice'), memberEntry('bob'), memberEntry('alice')];

    expect(normalize(entries)).toEqual({
      error: 'Duplicate ACL entry for user "alice"',
    });
  });

  it('strips unknown properties from the returned entries', () => {
    const entries = [
      { ...memberEntry('alice'), added_at: '2026-01-01T00:00:00.000Z' },
    ] as unknown as ConversationAccessControlEntryInput[];

    expect(normalize(entries)).toEqual({
      entries: [memberEntry('alice')],
    });
  });
});
