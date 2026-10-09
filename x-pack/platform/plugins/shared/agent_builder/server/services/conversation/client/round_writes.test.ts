/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createRound } from '../../../test_utils';
import { reconcileAttachments, upsertRound } from './round_writes';

const ids = (rounds: ConversationRound[]) => rounds.map(({ id }) => id);

describe('upsertRound', () => {
  it('appends when the round id is not present', () => {
    const existing = createRound({ id: 'round-1' });
    const added = createRound({ id: 'round-2' });

    expect(ids(upsertRound([existing], added))).toEqual(['round-1', 'round-2']);
  });

  it('appends to an empty conversation', () => {
    const added = createRound({ id: 'round-1' });

    expect(upsertRound([], added)).toEqual([added]);
  });

  it('replaces in place when the round id already exists (HITL resume)', () => {
    const first = createRound({ id: 'round-1', input: { message: 'pending' } });
    const second = createRound({ id: 'round-2' });
    const resumed = createRound({ id: 'round-1', input: { message: 'resumed' } });

    const result = upsertRound([first, second], resumed);

    expect(ids(result)).toEqual(['round-1', 'round-2']);
    expect(result[0]).toBe(resumed);
  });

  it('drops the superseded round (regenerate)', () => {
    const first = createRound({ id: 'round-1' });
    const second = createRound({ id: 'round-2', input: { message: 'original' } });
    const regenerated = createRound({ id: 'round-3', input: { message: 'regenerated' } });

    const result = upsertRound([first, second], regenerated, 'round-2');

    expect(ids(result)).toEqual(['round-1', 'round-3']);
  });

  it('appends the replacement after a concurrently added round', () => {
    const first = createRound({ id: 'round-1' });
    const superseded = createRound({ id: 'round-2' });
    const concurrent = createRound({ id: 'round-concurrent' });
    const regenerated = createRound({ id: 'round-3' });

    const result = upsertRound([first, superseded, concurrent], regenerated, 'round-2');

    // appended, not slotted where round-2 was, so it still sorts last
    expect(ids(result)).toEqual(['round-1', 'round-concurrent', 'round-3']);
  });

  it('ignores a replacesRoundId that matches the incoming round', () => {
    const existing = createRound({ id: 'round-1', input: { message: 'original' } });
    const replacement = createRound({ id: 'round-1', input: { message: 'replacement' } });

    const result = upsertRound([existing], replacement, 'round-1');

    expect(ids(result)).toEqual(['round-1']);
    expect(result[0]).toBe(replacement);
  });

  it('is idempotent, so a retried write cannot duplicate a round', () => {
    const existing = createRound({ id: 'round-1' });
    const added = createRound({ id: 'round-2' });

    const once = upsertRound([existing], added);
    const twice = upsertRound(once, added);

    expect(ids(twice)).toEqual(['round-1', 'round-2']);
  });

  it('preserves a round appended concurrently by another writer', () => {
    const existing = createRound({ id: 'round-1' });
    const concurrent = createRound({ id: 'round-concurrent' });
    const added = createRound({ id: 'round-2' });

    const result = upsertRound([existing, concurrent], added);

    expect(ids(result)).toEqual(['round-1', 'round-concurrent', 'round-2']);
  });

  it('does not mutate the input array', () => {
    const rounds = [createRound({ id: 'round-1' })];

    upsertRound(rounds, createRound({ id: 'round-2' }));

    expect(ids(rounds)).toEqual(['round-1']);
  });
});

describe('reconcileAttachments', () => {
  const attachment = (id: string, overrides: Record<string, unknown> = {}) =>
    ({
      id,
      versions: [],
      current_version: 1,
      active: true,
      ...overrides,
    } as unknown as VersionedAttachment);

  it('keeps an attachment the operation created', () => {
    const created = attachment('created');

    expect(reconcileAttachments({ snapshot: [], stored: [], produced: [created] })).toEqual([
      created,
    ]);
  });

  it('keeps an attachment added concurrently', () => {
    const concurrent = attachment('concurrent');

    expect(reconcileAttachments({ snapshot: [], stored: [concurrent], produced: [] })).toEqual([
      concurrent,
    ]);
  });

  it('keeps an edit the operation made to a pre-existing attachment', () => {
    // the round updated X in memory; nothing has written it yet, so `stored`
    // still holds the old record and would otherwise silently win
    const original = attachment('X', { current_version: 1 });
    const edited = attachment('X', { current_version: 2 });

    expect(
      reconcileAttachments({ snapshot: [original], stored: [original], produced: [edited] })
    ).toEqual([edited]);
  });

  it('keeps an edit that does not bump the version', () => {
    // description, hidden, readonly and soft deletes all mutate without bumping
    const original = attachment('X', { description: 'before' });
    const renamed = attachment('X', { description: 'after' });

    expect(
      reconcileAttachments({ snapshot: [original], stored: [original], produced: [renamed] })
    ).toEqual([renamed]);

    const deleted = attachment('X', { description: 'before', active: false });

    expect(
      reconcileAttachments({ snapshot: [original], stored: [original], produced: [deleted] })
    ).toEqual([deleted]);
  });

  it('yields to a concurrent edit of an attachment the operation only carried along', () => {
    const original = attachment('X', { description: 'before' });
    const concurrentlyRenamed = attachment('X', { description: 'renamed by someone else' });

    expect(
      reconcileAttachments({
        snapshot: [original],
        stored: [concurrentlyRenamed],
        produced: [original],
      })
    ).toEqual([concurrentlyRenamed]);
  });

  it('respects a concurrent removal of an attachment it only carried along', () => {
    const original = attachment('X');

    expect(
      reconcileAttachments({ snapshot: [original], stored: [], produced: [original] })
    ).toEqual([]);
  });

  it('keeps both an operation edit and a concurrent edit to different attachments', () => {
    const untouched = attachment('untouched', { description: 'before' });
    const concurrentlyRenamed = attachment('untouched', { description: 'after' });
    const original = attachment('edited', { current_version: 1 });
    const edited = attachment('edited', { current_version: 2 });

    const result = reconcileAttachments({
      snapshot: [untouched, original],
      stored: [concurrentlyRenamed, original],
      produced: [untouched, edited],
    });

    expect(result).toEqual([concurrentlyRenamed, edited]);
  });
});
