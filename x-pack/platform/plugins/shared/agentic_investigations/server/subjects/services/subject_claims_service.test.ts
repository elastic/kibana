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
  const wait = jest.fn().mockResolvedValue(undefined);
  const service = new SubjectClaimsService({ storage, now: () => nowMs, wait });
  const advance = (ms: number) => {
    nowMs += ms;
  };
  const holderOf = (subject: typeof ALERT | typeof EVENT, spaceId = SPACE_ID) =>
    storage.entries.get(subjectClaimId(spaceId, subject))?.source.conversationId;
  return { storage, service, advance, holderOf, wait };
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

  it('removes the claims it already wrote when a later claim fails', async () => {
    const { storage, service, holderOf } = setup();
    const index = storage.index as jest.Mock;
    const realIndex = index.getMockImplementation();
    index.mockImplementationOnce(async (request) => realIndex?.(request));
    index.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjects: [ALERT, EVENT],
        isHolderOpen: isOpen(true),
      })
    ).rejects.toThrow('storage unavailable');

    expect(holderOf(ALERT)).toBeUndefined();
    expect(holderOf(EVENT)).toBeUndefined();
  });

  it('keeps the claims the investigation held before a failed claim', async () => {
    const { storage, service, holderOf } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    (storage.index as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjects: [ALERT, EVENT],
        isHolderOpen: isOpen(true),
      })
    ).rejects.toThrow('storage unavailable');

    expect(holderOf(ALERT)).toBe('conv-1');
    expect(holderOf(EVENT)).toBeUndefined();
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

  it('waits for a concurrent claim that is not searchable yet and reports its holder', async () => {
    const { storage, service, wait } = setup();
    const id = subjectClaimId(SPACE_ID, ALERT);
    const index = storage.index as jest.Mock;
    const realIndex = index.getMockImplementation();
    index.mockImplementationOnce(async (request) => {
      storage.put(id, {
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjectType: 'alert',
        subjectId: 'alert-1',
        claimedAt: new Date().toISOString(),
      });
      return realIndex?.(request);
    });
    // The concurrent claim only shows up in searches after an index refresh.
    const search = storage.search as jest.Mock;
    for (let read = 0; read < 3; read++) {
      search.mockResolvedValueOnce({ hits: { hits: [] } });
    }

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
    expect(wait.mock.calls).toEqual([[100], [200], [400]]);
  });

  it('claims on a fresh cluster whose claim index does not exist yet', async () => {
    const { service, storage, holderOf } = setup();
    jest.mocked(storage.search).mockRejectedValueOnce(
      Object.assign(new Error('no such index'), {
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
      })
    );

    await expect(
      service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      })
    ).resolves.toEqual({ claimed: true });
    expect(holderOf(ALERT)).toBe('conv-1');
  });

  it('retries a claim read while the new claim index has no available shard', async () => {
    jest.useFakeTimers();
    try {
      const { service, storage } = setup();
      await service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      });
      jest.mocked(storage.search).mockRejectedValueOnce(
        Object.assign(new Error('all shards failed'), {
          statusCode: 503,
          body: {
            error: {
              type: 'search_phase_execution_exception',
              root_cause: [{ type: 'no_shard_available_action_exception' }],
            },
          },
        })
      );

      const claim = service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen: isOpen(true),
      });
      await jest.advanceTimersByTimeAsync(200);

      await expect(claim).resolves.toEqual({ claimed: false, heldBy: 'conv-1' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('releases the claims a failed start took', async () => {
    const { service, holderOf } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT, EVENT],
      isHolderOpen: isOpen(true),
    });

    await service.release({ spaceId: SPACE_ID, conversationId: 'conv-1' });

    expect(holderOf(ALERT)).toBeUndefined();
    expect(holderOf(EVENT)).toBeUndefined();
  });

  it('leaves a claim another investigation holds when releasing', async () => {
    const { service, holderOf } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-other',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [EVENT],
      isHolderOpen: isOpen(true),
    });

    await service.release({ spaceId: SPACE_ID, conversationId: 'conv-1' });

    expect(holderOf(ALERT)).toBe('conv-other');
    expect(holderOf(EVENT)).toBeUndefined();
  });

  it('leaves a claim another start took over after the release read it', async () => {
    const { storage, service, holderOf, advance } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    const id = subjectClaimId(SPACE_ID, ALERT);
    const deleteMock = storage.delete as jest.Mock;
    const deleteClaim = deleteMock.getMockImplementation();
    deleteMock.mockImplementationOnce(async (request) => {
      advance(SUBJECT_CLAIM_PENDING_MS);
      await service.claim({
        spaceId: SPACE_ID,
        conversationId: 'conv-2',
        subjects: [ALERT],
        isHolderOpen: isOpen(false),
      });
      return deleteClaim?.(request);
    });

    await service.release({ spaceId: SPACE_ID, conversationId: 'conv-1' });

    expect(storage.delete).toHaveBeenCalledWith(expect.objectContaining({ id }));
    expect(holderOf(ALERT)).toBe('conv-2');
  });

  it('does not delete a claim it cannot read', async () => {
    const { storage, service, holderOf } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    (storage.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });

    await service.release({ spaceId: SPACE_ID, conversationId: 'conv-1' });

    expect(storage.delete).not.toHaveBeenCalled();
    expect(holderOf(ALERT)).toBe('conv-1');
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

  it('deletes every claim in every space for maintenance', async () => {
    const { service, storage } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });
    await service.claim({
      spaceId: 'other',
      conversationId: 'conv-2',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });

    await expect(service.deleteAllAcrossSpaces()).resolves.toBe(2);
    expect(storage.entries.size).toBe(0);
  });

  it('finds the holder of a subject in its space only', async () => {
    const { service } = setup();
    await service.claim({
      spaceId: SPACE_ID,
      conversationId: 'conv-1',
      subjects: [ALERT],
      isHolderOpen: isOpen(true),
    });

    await expect(service.findHolder(SPACE_ID, ALERT)).resolves.toBe('conv-1');
    await expect(service.findHolder('other', ALERT)).resolves.toBeUndefined();
    await expect(service.findHolder(SPACE_ID, EVENT)).resolves.toBeUndefined();
  });
});
