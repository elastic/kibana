/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CurrentUser } from '@kbn/agent-builder-common';
import type { ConversationProperties } from './storage';
import { updateReadBy, isReadBy, migrateReadBy } from './read_by';

const ownerId = 'owner-id';
const otherId = 'other-id';
const owner: CurrentUser = { id: ownerId, username: 'owner', isAdmin: false };
const other: CurrentUser = { id: otherId, username: 'other', isAdmin: false };

const conversation = (overrides: Partial<ConversationProperties> = {}): ConversationProperties => ({
  agent_id: 'agent-1',
  user_id: ownerId,
  user_name: owner.username,
  space: 'default',
  title: 'Conversation',
  created_at: '2026-06-29T00:00:00.000Z',
  updated_at: '2026-06-29T00:00:00.000Z',
  conversation_rounds: [],
  ...overrides,
});

describe('isReadBy', () => {
  it('is true for a user whose id is in read_by', () => {
    expect(
      isReadBy({ source: conversation({ read_by: [{ userId: otherId }] }), user: other })
    ).toBe(true);
  });

  it('is false for a user whose id is not in read_by', () => {
    expect(
      isReadBy({ source: conversation({ read_by: [{ userId: ownerId }] }), user: other })
    ).toBe(false);
  });

  it('is false for everyone when read_by is empty, with no legacy fallback', () => {
    expect(isReadBy({ source: conversation({ read_by: [], read: true }), user: owner })).toBe(
      false
    );
  });

  it('falls back to the legacy read flag for the owner when read_by is absent', () => {
    expect(isReadBy({ source: conversation({ read: true }), user: owner })).toBe(true);
  });

  it('does not extend the legacy read flag to non-owners', () => {
    expect(isReadBy({ source: conversation({ read: true }), user: other })).toBe(false);
  });

  it('is false when both read_by and read are absent', () => {
    expect(isReadBy({ source: conversation(), user: owner })).toBe(false);
  });
});

describe('migrateReadBy', () => {
  it('passes an existing read_by through unchanged', () => {
    expect(migrateReadBy(conversation({ read_by: [{ userId: ownerId }] }))).toEqual([
      { userId: ownerId },
    ]);
  });

  it('seeds read_by with the owner when the legacy read flag was true', () => {
    expect(migrateReadBy(conversation({ read: true }))).toEqual([{ userId: ownerId }]);
  });

  it('does not seed read_by when the owner has no stable id', () => {
    expect(migrateReadBy(conversation({ read: true, user_id: undefined }))).toEqual([]);
  });

  it('is empty when both read_by and the legacy read flag are absent', () => {
    expect(migrateReadBy(conversation())).toEqual([]);
  });
});

describe('updateReadBy', () => {
  it('adds the user id when marking read', () => {
    expect(
      updateReadBy({ userId: otherId, readBy: [], currentRead: false, nextRead: true })
    ).toEqual({
      read: true,
      read_by: [{ userId: otherId }],
    });
  });

  it('removes the user id when marking unread', () => {
    expect(
      updateReadBy({
        userId: otherId,
        readBy: [{ userId: ownerId }, { userId: otherId }],
        currentRead: true,
        nextRead: false,
      })
    ).toEqual({ read: false, read_by: [{ userId: ownerId }] });
  });

  it('preserves every other entry', () => {
    expect(
      updateReadBy({
        userId: otherId,
        readBy: [{ userId: ownerId }],
        currentRead: false,
        nextRead: true,
      })
    ).toEqual({
      read: true,
      read_by: [{ userId: ownerId }, { userId: otherId }],
    });
  });

  it('does not duplicate an id already marked read', () => {
    expect(
      updateReadBy({
        userId: otherId,
        readBy: [{ userId: otherId }],
        currentRead: true,
        nextRead: true,
      })
    ).toEqual({ read: true, read_by: [{ userId: otherId }] });
  });

  it('is a no-op when the user has no stable id, preserving the current read value', () => {
    const readBy = [{ userId: ownerId }];

    expect(updateReadBy({ userId: undefined, readBy, currentRead: false, nextRead: true })).toEqual(
      {
        read: false,
        read_by: readBy,
      }
    );
    expect(
      updateReadBy({ userId: undefined, readBy, currentRead: false, nextRead: false })
    ).toEqual({
      read: false,
      read_by: readBy,
    });
  });

  it('defaults to an empty list when readBy is undefined', () => {
    expect(updateReadBy({ userId: otherId, currentRead: false, nextRead: true })).toEqual({
      read: true,
      read_by: [{ userId: otherId }],
    });
  });
});
