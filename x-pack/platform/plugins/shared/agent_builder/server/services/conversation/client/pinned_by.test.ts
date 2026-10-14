/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CurrentUser } from '@kbn/agent-builder-common';
import type { ConversationProperties } from './storage';
import { updatePinnedBy, isPinnedBy, migratePinnedBy } from './pinned_by';

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

describe('isPinnedBy', () => {
  it('is true for a user whose id is in pinned_by', () => {
    expect(
      isPinnedBy({ source: conversation({ pinned_by: [{ userId: otherId }] }), user: other })
    ).toBe(true);
  });

  it('is false for a user whose id is not in pinned_by', () => {
    expect(
      isPinnedBy({ source: conversation({ pinned_by: [{ userId: ownerId }] }), user: other })
    ).toBe(false);
  });

  it('is false for everyone when pinned_by is empty, with no legacy fallback', () => {
    expect(isPinnedBy({ source: conversation({ pinned_by: [], pinned: true }), user: owner })).toBe(
      false
    );
  });

  it('falls back to the legacy pinned flag for the owner when pinned_by is absent', () => {
    expect(isPinnedBy({ source: conversation({ pinned: true }), user: owner })).toBe(true);
  });

  it('does not extend the legacy pinned flag to non-owners', () => {
    expect(isPinnedBy({ source: conversation({ pinned: true }), user: other })).toBe(false);
  });

  it('is false when both pinned_by and pinned are absent', () => {
    expect(isPinnedBy({ source: conversation(), user: owner })).toBe(false);
  });
});

describe('migratePinnedBy', () => {
  it('passes an existing pinned_by through unchanged', () => {
    expect(migratePinnedBy(conversation({ pinned_by: [{ userId: ownerId }] }))).toEqual([
      { userId: ownerId },
    ]);
  });

  it('seeds pinned_by with the owner when the legacy pinned flag was true', () => {
    expect(migratePinnedBy(conversation({ pinned: true }))).toEqual([{ userId: ownerId }]);
  });

  it('does not seed pinned_by when the owner has no stable id', () => {
    expect(migratePinnedBy(conversation({ pinned: true, user_id: undefined }))).toEqual([]);
  });

  it('is empty when both pinned_by and the legacy pinned flag are absent', () => {
    expect(migratePinnedBy(conversation())).toEqual([]);
  });
});

describe('updatePinnedBy', () => {
  it('adds the user id when pinning', () => {
    expect(
      updatePinnedBy({ userId: otherId, pinnedBy: [], currentPinned: false, nextPinned: true })
    ).toEqual({
      pinned: true,
      pinned_by: [{ userId: otherId }],
    });
  });

  it('removes the user id when unpinning', () => {
    expect(
      updatePinnedBy({
        userId: otherId,
        pinnedBy: [{ userId: ownerId }, { userId: otherId }],
        currentPinned: true,
        nextPinned: false,
      })
    ).toEqual({ pinned: false, pinned_by: [{ userId: ownerId }] });
  });

  it('preserves every other entry', () => {
    expect(
      updatePinnedBy({
        userId: otherId,
        pinnedBy: [{ userId: ownerId }],
        currentPinned: false,
        nextPinned: true,
      })
    ).toEqual({
      pinned: true,
      pinned_by: [{ userId: ownerId }, { userId: otherId }],
    });
  });

  it('does not duplicate an id that already pinned', () => {
    expect(
      updatePinnedBy({
        userId: otherId,
        pinnedBy: [{ userId: otherId }],
        currentPinned: true,
        nextPinned: true,
      })
    ).toEqual({ pinned: true, pinned_by: [{ userId: otherId }] });
  });

  it('is a no-op when the user has no stable id, preserving the current pinned value', () => {
    const pinnedBy = [{ userId: ownerId }];

    expect(
      updatePinnedBy({ userId: undefined, pinnedBy, currentPinned: false, nextPinned: true })
    ).toEqual({
      pinned: false,
      pinned_by: pinnedBy,
    });
    expect(
      updatePinnedBy({ userId: undefined, pinnedBy, currentPinned: true, nextPinned: false })
    ).toEqual({
      pinned: true,
      pinned_by: pinnedBy,
    });
  });

  it('defaults to an empty list when pinnedBy is undefined', () => {
    expect(updatePinnedBy({ userId: otherId, currentPinned: false, nextPinned: true })).toEqual({
      pinned: true,
      pinned_by: [{ userId: otherId }],
    });
  });
});
