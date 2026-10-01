/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import type { SubjectClaimDocument } from '../storage/subject_storage';
import {
  SUBJECT_CLAIM_PENDING_MS,
  SubjectClaimsService,
  subjectClaimId,
} from './subject_claims_service';

const SPACE_ID = 'default';
const ALERT = { type: 'alert' as const, id: 'alert-1' };
const EVENT = { type: 'significant_event' as const, id: 'event-1' };

const setup = (startMs = Date.parse('2026-09-01T00:00:00.000Z')) => {
  const storage = createInMemoryStorage<SubjectClaimDocument>();
  let nowMs = startMs;
  const service = new SubjectClaimsService({ storage, now: () => nowMs });
  const advance = (ms: number) => {
    nowMs += ms;
  };
  const holderOf = (subject: typeof ALERT | typeof EVENT, spaceId = SPACE_ID) =>
    storage.entries.get(subjectClaimId(spaceId, subject))?.source.conversationId;
  return { storage, service, advance, holderOf };
};

const isOpen = (open: boolean) => jest.fn().mockResolvedValue(open);

describe('SubjectClaimsService', () => {
  it('claims unclaimed subjects and is idempotent for the same investigation', async () => {
    const { service, holderOf } = setup();

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjects: [ALERT, EVENT],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: true });
    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: true });

    expect(holderOf(ALERT)).toBe('conv-1');
    expect(holderOf(EVENT)).toBe('conv-1');
  });

  it('reports the holder of a pending claim without asking whether it is open', async () => {
    const { service } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    const isHolderOpen = isOpen(false);

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen,
      })
    ).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
    expect(isHolderOpen).not.toHaveBeenCalled();
  });

  it('keeps a claim whose investigation is still open after the pending window', async () => {
    const { service, advance } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    advance(SUBJECT_CLAIM_PENDING_MS + 1);
    const isHolderOpen = isOpen(true);

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen,
      })
    ).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
    expect(isHolderOpen).toHaveBeenCalledWith('conv-1');
  });

  it('takes over a claim whose investigation is closed or gone', async () => {
    const { service, advance, holderOf } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    advance(SUBJECT_CLAIM_PENDING_MS + 1);

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen: isOpen(false),
      })
    ).resolves.toEqual({ claimed: true });
    expect(holderOf(ALERT)).toBe('conv-2');
  });

  it('claims all subjects or none, handing what it took to the holder', async () => {
    const { service, holderOf } = setup();
    // Claims are taken in claim id order: hold the later one so the call takes the earlier first.
    const [first, second] = [ALERT, EVENT].sort((left, right) =>
      subjectClaimId(SPACE_ID, left).localeCompare(subjectClaimId(SPACE_ID, right))
    );
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [second],
      isHolderOpen: isOpen(true),
    });

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [second, first],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
    // The caller follows up on conv-1 with both subjects, so a concurrent start for the first
    // subject must be pointed there too, not at the abandoned conv-2.
    expect(holderOf(first)).toBe('conv-1');
    expect(holderOf(second)).toBe('conv-1');
    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-3',
        subjects: [first],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
  });

  it('keeps claims apart per space', async () => {
    const { service } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });

    await expect(
      service.claim({
        spaceId: 'other',
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: true });
  });

  it('re-reads when a concurrent start wins the create', async () => {
    const { storage, service } = setup();
    const id = subjectClaimId(SPACE_ID, ALERT);
    const index = storage.index as jest.Mock;
    const realIndex = index.getMockImplementation();
    index.mockImplementationOnce(async (request) => {
      // Another start creates the claim between this call's read and its write.
      storage.put(id, {
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjectType: 'alert',
        subjectId: 'alert-1',
        claimedAt: new Date().toISOString(),
      });
      return realIndex?.(request);
    });

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
  });

  it('deletes every claim in a space for maintenance', async () => {
    const { service, storage } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT, EVENT],
      isHolderOpen: isOpen(true),
    });
    await service.claim({
      spaceId: 'other',
      conversationId: 'conv-2',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });

    await expect(service.deleteAllInSpace(SPACE_ID)).resolves.toBe(2);
    expect(storage.entries.size).toBe(1);
  });
});
