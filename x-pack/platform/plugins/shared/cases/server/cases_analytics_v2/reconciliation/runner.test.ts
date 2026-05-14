/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { makeCase, makeWriterMock, stubFindOnePage } from '../__test_helpers__';
import { runReconciliation } from './runner';

describe('runReconciliation', () => {
  const logger = loggerMock.create();

  /**
   * Each test gets its own SO client + mocked writer so call counts and
   * mock state never leak across tests. Templates / cases relevant to the
   * test are passed as the `cases` arg.
   */
  const setup = (cases: Parameters<typeof stubFindOnePage>[1] = []) => {
    const client = savedObjectsClientMock.create();
    stubFindOnePage(client, cases);
    return { client, writer: makeWriterMock() };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reconciles cases updated since lastRunAt', async () => {
    // Updated since lastRunAt — the classic "patched after a missed write" case.
    const { client, writer } = setup([
      makeCase('case-B', { createdAt: '2026-05-01T00:00:00.000Z', updatedAt: '2026-05-05T00:00:00.000Z' }),
    ]);

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
    // A newly-created case whose writer hook failed has `updated_at: null`
    // until someone patches it. The OR-clause in the filter must still
    // surface it via `created_at`.
    const { client, writer } = setup([
      makeCase('case-A', { createdAt: '2026-05-05T00:00:00.000Z', updatedAt: null }),
    ]);

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
    const { client, writer } = setup([
      makeCase('case-A', { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: null }),
      makeCase('case-B', {
        createdAt: '2025-06-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z',
      }),
    ]);

    const result = await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: undefined,
    });

    // No filter passed when lastRunAt is undefined.
    expect(client.find).toHaveBeenCalledWith(expect.objectContaining({ filter: undefined }));
    // Sort is intentionally omitted — the SO API auto-uses `_shard_doc` with
    // a PIT, which is the unique-per-doc sort that prevents `searchAfter`
    // skips/dupes when many cases share the same timestamp (bulk imports).
    const findArgs = client.find.mock.calls[0]?.[0] ?? {};
    expect(findArgs).not.toHaveProperty('sortField');
    expect(findArgs).not.toHaveProperty('sortOrder');
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
    const { client, writer } = setup([]); // empty → immediate drain

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
    const writer = makeWriterMock();
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
