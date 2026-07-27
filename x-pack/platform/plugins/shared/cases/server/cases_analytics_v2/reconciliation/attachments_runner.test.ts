/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { KueryNode } from '@kbn/es-query';
import { toKqlExpression } from '@kbn/es-query';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../../common/types/attachments_v2';
import type { CasesAttachmentsV2WriterContract } from '../writer/attachments';
import { runAttachmentsReconciliation } from './attachments_runner';

/**
 * Tests for the attachments-surface reconciliation runner. The
 * runner has one structural difference from the cases + activity
 * runners: it walks BOTH `cases-comments` AND `cases-attachments`
 * SOs into a single analytics index in one tick, sharing a cursor
 * across the two walks.
 *
 * The dual-source path is the highest-risk part of the runner — a
 * subtle offset / cursor / counter regression there would silently
 * skip a source type's attachments. Tests below pin:
 *   - both source SO types are always walked (ungated).
 *   - the shared `processed` counter is monotonically cumulative.
 *   - the filter is the cases-surface OR-NULL shape (mutable surface).
 *   - `namespaces: ['*']` is opted into on every PIT open and every
 *     paged find for both source types.
 *   - PITs from both source walks are closed even if a walk throws.
 */

// ----- Helpers -----

const makeAttachmentSO = (
  type: typeof CASE_COMMENT_SAVED_OBJECT | typeof CASE_ATTACHMENT_SAVED_OBJECT,
  id: string,
  opts: { createdAt?: string; updatedAt?: string | null; owner?: string } = {}
): SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes> =>
  ({
    type,
    id,
    namespaces: ['default'],
    references: [{ id: 'case-1', type: CASE_SAVED_OBJECT, name: 'associated-cases' }],
    attributes: {
      type: type === CASE_COMMENT_SAVED_OBJECT ? 'user' : 'comment',
      owner: opts.owner ?? 'securitySolution',
      created_at: opts.createdAt ?? '2026-05-01T00:00:00.000Z',
      updated_at: opts.updatedAt === undefined ? '2026-05-01T00:00:00.000Z' : opts.updatedAt,
      pushed_at: null,
      pushed_by: null,
      updated_by: null,
      created_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
      ...(type === CASE_COMMENT_SAVED_OBJECT
        ? { comment: 'legacy comment' }
        : { data: { content: 'unified comment' } }),
    },
  } as unknown as SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>);

/**
 * Stubs the SO client's `find` to dispatch on the requested `type`,
 * returning a single populated page of legacy SOs OR a single
 * populated page of unified SOs OR an empty page after the first
 * page per type. Mirrors the production runner's per-type PIT walk
 * pattern (one PIT + one paginated walk per source type).
 */
const stubDualSourceFinds = (
  client: ReturnType<typeof savedObjectsClientMock.create>,
  pages: {
    // `makeAttachmentSO` returns the union type (it's keyed by the SO-type
    // string arg), so accept the union here rather than the narrow per-source
    // types — a union isn't assignable to a single arm.
    legacy?: Array<SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>>;
    unified?: Array<SavedObject<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>>;
  }
): void => {
  // Per-type call counters so each type returns its single populated
  // page on the first call and empty pages thereafter (terminating
  // the per-type loop).
  const calls: { [k: string]: number } = {
    [CASE_COMMENT_SAVED_OBJECT]: 0,
    [CASE_ATTACHMENT_SAVED_OBJECT]: 0,
  };
  client.find.mockImplementation(async ({ type }) => {
    const idx = calls[type as string]++;
    if (idx > 0) {
      // Subsequent finds (after the first page) terminate the per-type loop.
      return {
        saved_objects: [],
        total: 0,
        per_page: 100,
        page: 1,
      } as SavedObjectsFindResponse<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>;
    }
    const sos = type === CASE_COMMENT_SAVED_OBJECT ? pages.legacy ?? [] : pages.unified ?? [];
    return {
      saved_objects: sos.map((so, i) => ({ ...so, score: 1, sort: [i] })) as never,
      total: sos.length,
      per_page: 100,
      page: 1,
    } as SavedObjectsFindResponse<AttachmentPersistedAttributes | UnifiedAttachmentAttributes>;
  });
};

const makeAttachmentsWriterMock = (): jest.Mocked<CasesAttachmentsV2WriterContract> => ({
  upsertAttachment: jest.fn(),
  deleteAttachment: jest.fn(),
  bulkUpsertAttachments: jest.fn(),
  bulkDeleteAttachments: jest.fn(),
  bulkDeleteAttachmentsByCaseIds: jest.fn(),
  bulkUpsertAttachmentsAwait: jest.fn().mockResolvedValue(undefined),
});

describe('runAttachmentsReconciliation', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('walks BOTH cases-comments and cases-attachments SOs in a single tick', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    stubDualSourceFinds(client, {
      legacy: [
        makeAttachmentSO(CASE_COMMENT_SAVED_OBJECT, 'legacy-1', {
          updatedAt: '2026-05-05T00:00:00.000Z',
        }),
      ],
      unified: [
        makeAttachmentSO(CASE_ATTACHMENT_SAVED_OBJECT, 'unified-1', {
          updatedAt: '2026-05-05T00:00:00.000Z',
        }),
      ],
    });

    await runAttachmentsReconciliation({
      savedObjectsClient: client,
      attachmentsWriter: writer,
      logger,
      lastRunAt: '2026-05-04T00:00:00.000Z',
    });

    // One PIT per source type — the runner opens two distinct PITs.
    expect(client.openPointInTimeForType).toHaveBeenCalledTimes(2);
    expect(client.openPointInTimeForType).toHaveBeenCalledWith(
      CASE_COMMENT_SAVED_OBJECT,
      expect.objectContaining({ namespaces: ['*'] })
    );
    expect(client.openPointInTimeForType).toHaveBeenCalledWith(
      CASE_ATTACHMENT_SAVED_OBJECT,
      expect.objectContaining({ namespaces: ['*'] })
    );

    // Bulk-upsert was called with each source type's SOs.
    expect(writer.bulkUpsertAttachmentsAwait).toHaveBeenCalledTimes(2);
    const allUpsertedIds = (writer.bulkUpsertAttachmentsAwait as jest.Mock).mock.calls
      .flatMap((call) => call[0] as Array<SavedObject<unknown>>)
      .map((so) => so.id);
    expect(allUpsertedIds).toEqual(expect.arrayContaining(['legacy-1', 'unified-1']));
  });

  it('shared processed counter is monotonically cumulative across both walks', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    stubDualSourceFinds(client, {
      legacy: [
        makeAttachmentSO(CASE_COMMENT_SAVED_OBJECT, 'l-1'),
        makeAttachmentSO(CASE_COMMENT_SAVED_OBJECT, 'l-2'),
      ],
      unified: [
        makeAttachmentSO(CASE_ATTACHMENT_SAVED_OBJECT, 'u-1'),
        makeAttachmentSO(CASE_ATTACHMENT_SAVED_OBJECT, 'u-2'),
        makeAttachmentSO(CASE_ATTACHMENT_SAVED_OBJECT, 'u-3'),
      ],
    });

    // Capture every onPageComplete value to assert monotonicity AND
    // that the unified-walk count picks up where the legacy walk
    // left off (3, 4, 5 — not 1, 2, 3 reset per type).
    const processedSnapshots: number[] = [];
    const result = await runAttachmentsReconciliation({
      savedObjectsClient: client,
      attachmentsWriter: writer,
      logger,
      lastRunAt: undefined,
      onPageComplete: ({ processed }) => {
        processedSnapshots.push(processed);
      },
    });

    // Legacy walk emits its page (2 SOs), then unified walk emits
    // its page (3 SOs). The shared counter accumulates: [2, 5].
    expect(processedSnapshots).toEqual([2, 5]);
    expect(result.processed).toBe(5);
    // Each snapshot is >= the previous one (no resets across walks).
    for (let i = 1; i < processedSnapshots.length; i++) {
      expect(processedSnapshots[i]).toBeGreaterThanOrEqual(processedSnapshots[i - 1]);
    }
  });

  it('serializes the OR-NULL filter for both source types (mutable surface)', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    stubDualSourceFinds(client, { legacy: [], unified: [] });

    await runAttachmentsReconciliation({
      savedObjectsClient: client,
      attachmentsWriter: writer,
      logger,
      lastRunAt: '2026-05-04T00:00:00.000Z',
    });

    // Two `find` calls, one per source type. Each must carry the
    // OR-NULL filter shape — same shape as the cases runner because
    // attachments are mutable + carry the never-patched-`updated_at`
    // null branch.
    const findCalls = (client.find as jest.Mock).mock.calls;
    expect(findCalls.length).toBeGreaterThanOrEqual(2);

    for (const call of findCalls) {
      const arg = call[0] as { type: string; filter?: KueryNode; namespaces?: string[] };
      expect(arg.namespaces).toEqual(['*']);

      // Every paged find must include the surface's filter.
      expect(arg.filter).toBeDefined();
      const kuery = toKqlExpression(arg.filter as KueryNode);
      const TS_PATTERN = /"?2026-05-04T00\\?:00\\?:00\.000Z"?/;
      // Clause 1: cursor on updated_at.
      expect(kuery).toMatch(new RegExp(`attributes\\.updated_at\\s*>\\s*${TS_PATTERN.source}`));
      // Clause 2: missing-updated_at AND-ed with cursor on created_at.
      expect(kuery).toMatch(/not\s+\S+\.attributes\.updated_at\s*:\s*\*/i);
      expect(kuery).toMatch(new RegExp(`attributes\\.created_at\\s*>\\s*${TS_PATTERN.source}`));

      // Filter must be qualified with the SO type prefix the call is
      // for — a regression that mismatched the type prefix would
      // silently match nothing on the SO side.
      expect(kuery).toContain(arg.type);
    }
  });

  it('walks every attachment when lastRunAt is undefined (post-reset / first-ever)', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    stubDualSourceFinds(client, {
      legacy: [makeAttachmentSO(CASE_COMMENT_SAVED_OBJECT, 'l-1')],
      unified: [makeAttachmentSO(CASE_ATTACHMENT_SAVED_OBJECT, 'u-1')],
    });

    await runAttachmentsReconciliation({
      savedObjectsClient: client,
      attachmentsWriter: writer,
      logger,
      lastRunAt: undefined,
    });

    // No cursor → no filter on either find call.
    for (const call of (client.find as jest.Mock).mock.calls) {
      const arg = call[0] as { filter?: KueryNode };
      expect(arg.filter).toBeUndefined();
    }
  });

  it('closes BOTH PITs even if a per-source walk throws', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    // First find call (legacy walk) succeeds with one page; second
    // find (legacy walk's empty terminator) returns empty; third
    // (unified walk's first page) throws.
    let findIdx = 0;
    client.find.mockImplementation(async ({ type }) => {
      findIdx++;
      if (findIdx === 1 && type === CASE_COMMENT_SAVED_OBJECT) {
        const so = makeAttachmentSO(CASE_COMMENT_SAVED_OBJECT, 'l-1');
        return {
          saved_objects: [{ ...so, score: 1, sort: [0] }] as never,
          total: 1,
          per_page: 100,
          page: 1,
        } as SavedObjectsFindResponse<AttachmentPersistedAttributes>;
      }
      if (type === CASE_ATTACHMENT_SAVED_OBJECT) {
        throw new Error('boom on unified walk');
      }
      // Legacy walk's empty terminator.
      return {
        saved_objects: [],
        total: 0,
        per_page: 100,
        page: 1,
      } as SavedObjectsFindResponse<AttachmentPersistedAttributes>;
    });

    await expect(
      runAttachmentsReconciliation({
        savedObjectsClient: client,
        attachmentsWriter: writer,
        logger,
        lastRunAt: undefined,
      })
    ).rejects.toThrow('boom on unified walk');

    // PIT leak prevention — both source types' PITs must be closed
    // (the legacy walk's via its `finally`, the unified walk's via
    // its `finally` after the throw).
    expect(client.closePointInTime).toHaveBeenCalledTimes(2);
  });

  /**
   * Since PR #275225 the unified `cases-attachments` SO is always
   * registered alongside legacy `cases-comments`, so the runner walks
   * BOTH source types on every tick with no config-gated single-source
   * mode — there is no `sourceTypes` opt-in to pass. This test pins the
   * ungated dual-source contract: both PITs open, both types walked.
   */
  it('always walks BOTH cases-comments and cases-attachments (ungated dual-source)', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    stubDualSourceFinds(client, {
      legacy: [makeAttachmentSO(CASE_COMMENT_SAVED_OBJECT, 'l-1')],
      unified: [makeAttachmentSO(CASE_ATTACHMENT_SAVED_OBJECT, 'u-1')],
    });

    await runAttachmentsReconciliation({
      savedObjectsClient: client,
      attachmentsWriter: writer,
      logger,
      lastRunAt: undefined,
    });

    // One PIT per source type — both must be opened.
    expect(client.openPointInTimeForType).toHaveBeenCalledTimes(2);
    expect(client.openPointInTimeForType).toHaveBeenCalledWith(
      CASE_COMMENT_SAVED_OBJECT,
      expect.objectContaining({ namespaces: ['*'] })
    );
    expect(client.openPointInTimeForType).toHaveBeenCalledWith(
      CASE_ATTACHMENT_SAVED_OBJECT,
      expect.objectContaining({ namespaces: ['*'] })
    );
    // Both source types are queried via `find`.
    const findTypes = (client.find as jest.Mock).mock.calls.map(
      (call) => (call[0] as { type: string }).type
    );
    expect(findTypes).toContain(CASE_COMMENT_SAVED_OBJECT);
    expect(findTypes).toContain(CASE_ATTACHMENT_SAVED_OBJECT);
  });

  it('advances the cursor to tick start time on successful drain', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeAttachmentsWriterMock();
    stubDualSourceFinds(client, { legacy: [], unified: [] });

    const before = Date.now();
    const result = await runAttachmentsReconciliation({
      savedObjectsClient: client,
      attachmentsWriter: writer,
      logger,
      lastRunAt: '2026-05-01T00:00:00.000Z',
    });
    const after = Date.now();

    const cursorMs = new Date(result.newLastRunAt).getTime();
    expect(cursorMs).toBeGreaterThanOrEqual(before);
    expect(cursorMs).toBeLessThanOrEqual(after);
  });
});
