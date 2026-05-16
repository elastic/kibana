/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { toKqlExpression, type KueryNode } from '@kbn/es-query';
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
      makeCase('case-B', {
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-05T00:00:00.000Z',
      }),
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

  it('reconciles every case whose updated_at is null, regardless of created_at', async () => {
    // A newly-created case whose writer hook failed has `updated_at: null`
    // until someone patches it. The OR-clause's null branch is
    // unconditional on `created_at` so:
    //   - `case-A` (just created, brand-new) still surfaces.
    //   - `case-orphan` (created long ago, writer-hook-missed, never
    //     patched) ALSO surfaces. Gating the null branch on
    //     `created_at > lastRunAt` would let it slip through forever.
    const { client, writer } = setup([
      makeCase('case-A', { createdAt: '2026-05-05T00:00:00.000Z', updatedAt: null }),
      makeCase('case-orphan', { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: null }),
    ]);

    const result = await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: '2026-05-04T00:00:00.000Z',
    });

    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledTimes(1);
    expect(writer.bulkUpsertCasesAwait).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'case-A' }),
        expect.objectContaining({ id: 'case-orphan' }),
      ])
    );
    expect(result.processed).toBe(2);
  });

  /**
   * FAILURE SCENARIO: Reconciliation filter narrows the null branch to
   *                   `created_at > lastRunAt`
   * Symptom: After `/reset`, only cases the user has patched come back.
   *          Ancient cases whose initial fire-and-forget write failed
   *          (or whose space had analyticsV2 disabled at create time)
   *          stay missing forever — the first post-reset tick advances
   *          the cursor past them, and every subsequent tick filters
   *          them out because `created_at < lastRunAt`.
   * Log signature: none (silent under-reporting; tenants notice via
   *                missing rows in Lens / Discover).
   * Trigger: Any refactor that re-adds an `AND created_at > lastRunAt`
   *          guard to the null branch under the assumption that "we'd
   *          have caught it on a previous tick already" — that
   *          assumption breaks the first time the previous tick
   *          ran with a writer that was failing on a subset of cases.
   * Recovery: Restore the unconditional null branch. The structural
   *           filter assertion below pins this contract.
   */
  it('serializes a filter whose null branch is unconditional (no created_at gate)', async () => {
    // Structural lock — the mocked `find` doesn't apply the filter so we
    // assert on the serialized KQL instead. Anything tighter than `OR (not
    // <type>.attributes.updated_at:*)` re-introduces the orphan-case bug.
    const { client, writer } = setup([]);

    await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: '2026-05-04T00:00:00.000Z',
    });

    expect(client.find).toHaveBeenCalled();
    const findArgs = client.find.mock.calls[0]?.[0] as { filter?: KueryNode };
    expect(findArgs.filter).toBeDefined();
    const kuery = toKqlExpression(findArgs.filter as KueryNode);
    // The cursor clause is still there.
    expect(kuery).toMatch(/attributes\.updated_at\s*>\s*"2026-05-04T00:00:00\.000Z"/);
    // The null clause is there.
    expect(kuery).toMatch(/not\s+cases\.attributes\.updated_at\s*:\s*\*/i);
    // ...and it is NOT AND-ed with a `created_at` guard. If someone
    // re-introduces the orphan-skipping filter, this regex matches and
    // fails the test.
    expect(kuery).not.toMatch(/created_at/i);
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

  /**
   * FAILURE SCENARIO: Reconciliation walk silently scoped to the
   *                   `default` namespace
   * Symptom: After `/reset`, only cases that live in the `default` space
   *          come back. Cases in any other space (e.g. `analytics-1`,
   *          `analytics-2`, ...) stay invisible to the analytics index
   *          until someone manually patches them (which routes through
   *          the fire-and-forget write hook, which DOES know about its
   *          request's namespace). The user-visible pattern looks like
   *          "only cases with a template field show up" because in
   *          tenants where users only configure templates per-space, the
   *          template-having spaces tend to overlap with `default`.
   * Log signature: none (silent under-walk; the SO `find` returns zero
   *                results across all non-default spaces and the runner
   *                logs `processed=0` for them implicitly).
   * Trigger: The runner's SO client is the v2 internal client (unscoped,
   *          no spaces extension). The SO repository's `find` and
   *          `openPointInTimeForType` both default `options.namespaces`
   *          to `[DEFAULT_NAMESPACE_STRING]` when omitted (see
   *          `core/saved-objects/api-server-internal/.../find.ts`
   *          and `.../open_point_in_time.ts`). Omitting the param —
   *          which the original implementation did — silently restricts
   *          the walk to `default` even on an unscoped client.
   * Recovery: Pass `namespaces: ['*']` on BOTH calls; the SO repository's
   *           search DSL builder treats `'*'` as the
   *           `ALL_NAMESPACES_STRING` sentinel and lifts the namespace
   *           filter from the query.
   */
  it('passes namespaces: ["*"] to both the PIT open and every paged find so the walk crosses every space', async () => {
    const { client, writer } = setup([
      makeCase('case-default', {
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      }),
    ]);

    await runReconciliation({
      savedObjectsClient: client,
      writer,
      logger,
      lastRunAt: undefined,
    });

    // PIT open must carry the cross-namespace sentinel — the PIT
    // captures the snapshot the page reads walk against, so a
    // default-only PIT would invisibly cap the walk even if the page
    // reads asked for `['*']`.
    expect(client.openPointInTimeForType).toHaveBeenCalledWith(
      'cases',
      expect.objectContaining({ namespaces: ['*'] })
    );
    // And every paged find must opt into the same scope.
    for (const call of (client.find as jest.Mock).mock.calls) {
      const arg = call[0] as { namespaces?: string[] };
      expect(arg.namespaces).toEqual(['*']);
    }
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
