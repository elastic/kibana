/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createRound } from '../../../test_utils';
import { mergeAttachmentsById, upsertRound } from './round_writes';

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

describe('mergeAttachmentsById', () => {
  const attachment = (id: string, description?: string) =>
    ({ id, description, versions: [], current_version: 1 } as unknown as VersionedAttachment);

  it('keeps attachments only present in the snapshot list', () => {
    const created = attachment('new');

    expect(mergeAttachmentsById([], [created])).toEqual([created]);
  });

  it('keeps attachments only present in the latest list', () => {
    const concurrent = attachment('concurrent');

    expect(mergeAttachmentsById([concurrent], [])).toEqual([concurrent]);
  });

  it('prefers the latest record so concurrent changes are not reverted', () => {
    const stale = attachment('shared', 'old name');
    const renamed = attachment('shared', 'new name');

    expect(mergeAttachmentsById([renamed], [stale])).toEqual([renamed]);
  });

  it('unions both lists', () => {
    const concurrent = attachment('concurrent');
    const created = attachment('created');

    const result = mergeAttachmentsById([concurrent], [created]);

    expect(result.map(({ id }) => id).sort()).toEqual(['concurrent', 'created']);
  });
});
