/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType, attachmentTools } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createRound } from '../../../test_utils';
import { reconcileAttachments } from './round_writes';

describe('reconcileAttachments', () => {
  const attachment = (id: string, overrides: Record<string, unknown> = {}) =>
    ({
      id,
      versions: [],
      current_version: 1,
      active: true,
      ...overrides,
    }) as unknown as VersionedAttachment;

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

  it('removes an attachment the producer started from and dropped (permanent delete)', () => {
    const kept = attachment('kept');
    const purged = attachment('purged');

    expect(
      reconcileAttachments({
        snapshot: [kept, purged],
        stored: [kept, purged],
        produced: [kept],
      })
    ).toEqual([kept]);
  });

  it('keeps a stored attachment the producer never saw (concurrent add)', () => {
    const kept = attachment('kept');
    const concurrent = attachment('concurrent');

    expect(
      reconcileAttachments({ snapshot: [kept], stored: [kept, concurrent], produced: [kept] })
    ).toEqual([kept, concurrent]);
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

  describe('permanent-delete guard against the rounds stored at write time', () => {
    const referencingRound = (attachmentId: string) =>
      createRound({
        id: 'round-ref',
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_call_id: 'tc-1',
            tool_id: attachmentTools.read,
            params: { attachment_id: attachmentId },
            results: [],
          } as unknown as ConversationRoundStep,
        ],
      });

    it('rejects removing an attachment that a stored round now references (stale eligibility check)', () => {
      const purged = attachment('purged');

      expect(() =>
        reconcileAttachments({
          snapshot: [purged],
          stored: [purged],
          produced: [],
          storedRounds: [referencingRound('purged')],
        })
      ).toThrow(
        expect.objectContaining({
          code: 'attachmentPermanentDeleteBlocked',
          meta: expect.objectContaining({ reason: 'referenced_in_rounds' }),
        })
      );
    });

    it('allows the removal when no stored round references the attachment', () => {
      const purged = attachment('purged');

      expect(
        reconcileAttachments({
          snapshot: [purged],
          stored: [purged],
          produced: [],
          storedRounds: [referencingRound('some-other-attachment')],
        })
      ).toEqual([]);
    });

    it('does not guard when storedRounds is omitted (in-execution producers never remove)', () => {
      const purged = attachment('purged');

      expect(reconcileAttachments({ snapshot: [purged], stored: [purged], produced: [] })).toEqual(
        []
      );
    });
  });
});
