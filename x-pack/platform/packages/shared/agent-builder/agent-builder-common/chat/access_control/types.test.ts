/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationAccessControlEntry } from './types';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  getDefaultConversationAccessControl,
  isPrivatelySharedConversation,
  isPublicConversation,
  isSharedConversation,
  normalizeConversationAccessControl,
} from './types';

const entry: ConversationAccessControlEntry = {
  type: 'user',
  id: 'alice-profile-id',
  role: ConversationAccessControlRole.Member,
  added_at: '2026-06-29T00:00:00.000Z',
};

describe('getDefaultConversationAccessControl', () => {
  it('defaults to a private conversation with no entries', () => {
    expect(getDefaultConversationAccessControl()).toEqual({
      access_mode: ConversationAccessControlMode.Private,
      entries: [],
    });
  });

  it('returns a new entries array on each call', () => {
    const first = getDefaultConversationAccessControl();
    first.entries.push(entry);

    expect(getDefaultConversationAccessControl().entries).toEqual([]);
  });
});

describe('normalizeConversationAccessControl', () => {
  it('returns the defaults when access control is undefined', () => {
    expect(normalizeConversationAccessControl(undefined)).toEqual({
      access_mode: ConversationAccessControlMode.Private,
      entries: [],
    });
  });

  it('defaults entries to an empty array for legacy access control', () => {
    expect(
      normalizeConversationAccessControl({ access_mode: ConversationAccessControlMode.Public })
    ).toEqual({
      access_mode: ConversationAccessControlMode.Public,
      entries: [],
    });
  });

  it('defaults the access mode to private when only entries are set', () => {
    expect(normalizeConversationAccessControl({ entries: [entry] })).toEqual({
      access_mode: ConversationAccessControlMode.Private,
      entries: [entry],
    });
  });

  it('preserves the access mode and entries when both are set', () => {
    expect(
      normalizeConversationAccessControl({
        access_mode: ConversationAccessControlMode.Public,
        entries: [entry],
      })
    ).toEqual({
      access_mode: ConversationAccessControlMode.Public,
      entries: [entry],
    });
  });
});

describe('isPublicConversation', () => {
  it('is not public when access control is undefined', () => {
    expect(isPublicConversation(undefined)).toBe(false);
  });

  it('is not public when private', () => {
    expect(
      isPublicConversation({
        access_mode: ConversationAccessControlMode.Private,
        entries: [entry],
      })
    ).toBe(false);
  });

  it('is public when the access mode is public', () => {
    expect(
      isPublicConversation({ access_mode: ConversationAccessControlMode.Public, entries: [] })
    ).toBe(true);
  });
});

describe('isPrivatelySharedConversation', () => {
  it('is not privately shared when access control is undefined', () => {
    expect(isPrivatelySharedConversation(undefined)).toBe(false);
  });

  it('is not privately shared when private with no entries', () => {
    expect(
      isPrivatelySharedConversation({
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      })
    ).toBe(false);
  });

  it('is privately shared when private with at least one entry', () => {
    expect(
      isPrivatelySharedConversation({
        access_mode: ConversationAccessControlMode.Private,
        entries: [entry],
      })
    ).toBe(true);
  });

  it('is not privately shared when public, even with entries', () => {
    expect(
      isPrivatelySharedConversation({
        access_mode: ConversationAccessControlMode.Public,
        entries: [entry],
      })
    ).toBe(false);
  });

  it('is privately shared for legacy access control with entries and no access mode', () => {
    expect(isPrivatelySharedConversation({ entries: [entry] })).toBe(true);
  });
});

describe('isSharedConversation', () => {
  it('is not shared when access control is undefined', () => {
    expect(isSharedConversation(undefined)).toBe(false);
  });

  it('is not shared when private with no entries', () => {
    expect(
      isSharedConversation({
        access_mode: ConversationAccessControlMode.Private,
        entries: [],
      })
    ).toBe(false);
  });

  it('is shared when private with at least one entry', () => {
    expect(
      isSharedConversation({
        access_mode: ConversationAccessControlMode.Private,
        entries: [entry],
      })
    ).toBe(true);
  });

  it('is shared when public with no entries', () => {
    expect(
      isSharedConversation({
        access_mode: ConversationAccessControlMode.Public,
        entries: [],
      })
    ).toBe(true);
  });

  it('is shared for legacy access control with entries and no access mode', () => {
    expect(isSharedConversation({ entries: [entry] })).toBe(true);
  });

  it('is shared for legacy public access control with no entries', () => {
    expect(isSharedConversation({ access_mode: ConversationAccessControlMode.Public })).toBe(true);
  });
});
