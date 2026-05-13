/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import { runReconciliation } from './runner';

// Helper: build a single SO with overridable timestamps.
const makeCase = (
  id: string,
  createdAt: string,
  updatedAt: string | null
): SavedObject<CasePersistedAttributes> =>
  ({
    type: CASE_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [],
    attributes: {
      owner: 'securitySolution',
      title: id,
      description: '',
      tags: [],
      assignees: [],
      severity: CasePersistedSeverity.LOW,
      status: CasePersistedStatus.OPEN,
      created_at: createdAt,
      updated_at: updatedAt,
      closed_at: null,
      created_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
      closed_by: null,
      updated_by: null,
      duration: null,
      total_alerts: 0,
      total_comments: 0,
      connector: { name: 'none', type: '.none', fields: null },
      external_service: null,
      settings: { syncAlerts: false },
    } as unknown as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

// Helper: stub the SO client's `find` to return a single page, then empty pages thereafter.
const stubFindWithPage = (
  client: ReturnType<typeof savedObjectsClientMock.create>,
  results: Array<SavedObject<CasePersistedAttributes>>
): void => {
  let called = false;
  client.find.mockImplementation(async () => {
    if (called) {
      return {
        saved_objects: [],
        total: 0,
        per_page: 100,
        page: 1,
      } as SavedObjectsFindResponse<CasePersistedAttributes>;
    }
    called = true;
    return {
      saved_objects: results.map((so, idx) => ({ ...so, score: 1, sort: [idx] })) as never,
      total: results.length,
      per_page: 100,
      page: 1,
    } as SavedObjectsFindResponse<CasePersistedAttributes>;
  });
};

const makeWriter = (): jest.Mocked<CasesAnalyticsV2WriterContract> => ({
  upsertCase: jest.fn(),
  deleteCase: jest.fn(),
  bulkUpsertCases: jest.fn(),
  bulkDeleteCases: jest.fn(),
  bulkUpsertCasesAwait: jest.fn().mockResolvedValue(undefined),
});

describe('runReconciliation', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reconciles cases updated since lastRunAt', async () => {
    // Updated since lastRunAt — the classic "patched after a missed write" case.
    const caseB = makeCase('case-B', '2026-05-01T00:00:00.000Z', '2026-05-05T00:00:00.000Z');
    const client = savedObjectsClientMock.create();
    const writer = makeWriter();
    stubFindWithPage(client, [caseB]);

    const result = await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: '2026-05-04T00:00:00.000Z',
    });

    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledTimes(1);
    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'case-B' })])
    );
    expect(result.processed).toBe(1);
  });

  it('reconciles cases created since lastRunAt even when updated_at is null', async () => {
    // The bug this whole filter rework exists to fix: a newly-created case
    // whose writer hook failed has updated_at === null forever (until someone
    // patches it). The OR-clause in the filter must surface it.
    const caseA = makeCase('case-A', '2026-05-05T00:00:00.000Z', null);
    const client = savedObjectsClientMock.create();
    const writer = makeWriter();
    stubFindWithPage(client, [caseA]);

    const result = await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: '2026-05-04T00:00:00.000Z',
    });

    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledTimes(1);
    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'case-A' })])
    );
    expect(result.processed).toBe(1);
  });

  it('walks every case when lastRunAt is undefined (first-ever run / post-reset)', async () => {
    // No cursor → no filter → walks every case. This is the path /reset
    // depends on after it clears the task state.
    const caseA = makeCase('case-A', '2024-01-01T00:00:00.000Z', null);
    const caseB = makeCase('case-B', '2025-06-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z');
    const client = savedObjectsClientMock.create();
    const writer = makeWriter();
    stubFindWithPage(client, [caseA, caseB]);

    const result = await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: undefined,
    });

    // No filter passed when lastRunAt is undefined.
    expect(client.find).toHaveBeenCalledWith(expect.objectContaining({ filter: undefined }));
    // Both cases land in a single bulk dispatch (one page → one bulk).
    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledTimes(1);
    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'case-A' }),
        expect.objectContaining({ id: 'case-B' }),
      ])
    );
    expect(result.processed).toBe(2);
  });

  it('advances the cursor to tick start time on successful drain', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeWriter();
    stubFindWithPage(client, []); // empty → immediate drain

    const before = Date.now();
    const result = await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: '2026-05-01T00:00:00.000Z',
    });
    const after = Date.now();

    // newLastRunAt should be an ISO timestamp captured between `before` and
    // `after` (tickStartedAt is set before any I/O).
    const cursorMs = new Date(result.newLastRunAt).getTime();
    expect(cursorMs).toBeGreaterThanOrEqual(before);
    expect(cursorMs).toBeLessThanOrEqual(after);
  });

  it('closes the PIT even if find throws', async () => {
    const client = savedObjectsClientMock.create();
    const writer = makeWriter();
    client.find.mockRejectedValue(new Error('boom'));

    await expect(
      runReconciliation({
        savedObjectsClient: client,
        writer,
        logger,
        lastRunAt: undefined,
      })
    ).rejects.toThrow('boom');

    // PIT leak prevention — `closePointInTime` is in a `finally` block.
    expect(client.closePointInTime).toHaveBeenCalledTimes(1);
    expect(client.closePointInTime).toHaveBeenCalledWith('some_pit_id');
  });
});
