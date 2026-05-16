/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { deleteAllPerSpaceCasesDataViews } from '.';

describe('deleteAllPerSpaceCasesDataViews', () => {
  const logger = loggerMock.create();

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * FAILURE SCENARIO: `/reset` only deletes the data view in the
   *                   requester's space (or in `default`) and silently
   *                   leaves every other space's data view orphaned.
   * Symptom: Operator hits `/reset`, expects every managed Cases data
   *          view across the cluster to be wiped, but only the data view
   *          in the requester's (or the internal client's default)
   *          namespace gets removed. The next case-page visit in any
   *          other space sees the stale data view (now pointing at the
   *          freshly-empty `.cases` index, so existing-runtime-fields
   *          assumptions are subtly wrong).
   * Log signature (before): `reset: failed to delete data view ... not found`
   *          per orphaned space.
   * Trigger: The SO repository's `delete` preflight
   *          (`preflightCheckNamespaces` in core) returns
   *          `found_outside_namespace` and surfaces as a 404 whenever
   *          the SO's `namespaces` array doesn't include the namespace
   *          the caller is operating against. The internal client's
   *          implicit default is `'default'`. `force: true` only widens
   *          the multi-share case (SO already in N spaces) — it does
   *          NOT bypass the preflight on the namespace mismatch.
   * Recovery: Pass the SO's own first namespace to `delete`, so the
   *           preflight runs against a namespace the SO is actually in.
   */
  it("deletes each managed Cases data view against the SO's own namespace with force: true", async () => {
    // Two invariants on the `delete` call site:
    //   1. `force: true` — `index-pattern` is `namespaceType: 'multiple'`,
    //      so a raw `delete` can leave the underlying ES doc behind and
    //      the next `createAndSave` 409s on the deterministic id with
    //      `version_conflict_engine_exception`.
    //   2. `namespace: <SO's first namespace>` — the function operates
    //      against an unscoped internal SO client, whose default
    //      namespace is `'default'`. Without the explicit namespace, the
    //      SO repository's preflight (`preflightCheckNamespaces`) would
    //      fail with `found_outside_namespace` and surface as a 404 for
    //      every data view that lives in a non-default space — even with
    //      `force: true`, because `force` widens the multi-share case but
    //      does not bypass the namespace preflight.
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'cases-analytics-managed-default',
          type: 'index-pattern',
          namespaces: ['default'],
          attributes: {},
          references: [],
          score: 0,
        },
        {
          id: 'cases-analytics-managed-team-a',
          type: 'index-pattern',
          namespaces: ['team-a'],
          attributes: {},
          references: [],
          score: 0,
        },
      ],
      total: 2,
      per_page: 100,
      page: 1,
    });
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });

    const deleted = await deleteAllPerSpaceCasesDataViews(soClient, logger);

    expect(deleted).toBe(2);
    expect(soClient.delete).toHaveBeenCalledWith(
      'index-pattern',
      'cases-analytics-managed-default',
      { namespace: 'default', force: true }
    );
    expect(soClient.delete).toHaveBeenCalledWith(
      'index-pattern',
      'cases-analytics-managed-team-a',
      { namespace: 'team-a', force: true }
    );
    // Explicit guard against regression: the unscoped internal client
    // requires `namespace` on every cross-namespace delete; a future
    // refactor that drops it would re-introduce the orphan-space bug.
    for (const call of (soClient.delete as jest.Mock).mock.calls) {
      const opts = call[2] as { namespace?: string };
      expect(opts).toHaveProperty('namespace');
      expect(opts.namespace).toBeTruthy();
    }
  });

  it('passes namespaces: ["*"] on find so the walk crosses every space', async () => {
    // Structural lock — the unscoped internal SO client defaults
    // `options.namespaces` to `[DEFAULT_NAMESPACE_STRING]` when omitted
    // (see `core/saved-objects/api-server-internal/.../find.ts`), so
    // dropping the `['*']` arg would silently scope the walk to
    // `default` and the cross-namespace cleanup would regress.
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });

    await deleteAllPerSpaceCasesDataViews(soClient, logger);

    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'index-pattern',
        namespaces: ['*'],
      })
    );
  });

  it('skips data views whose id does not start with the managed prefix', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'user-created-index-pattern',
          type: 'index-pattern',
          namespaces: ['default'],
          attributes: {},
          references: [],
          score: 0,
        },
      ],
      total: 1,
      per_page: 100,
      page: 1,
    });
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });

    const deleted = await deleteAllPerSpaceCasesDataViews(soClient, logger);

    expect(deleted).toBe(0);
    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('walks every page before deleting so page-shift never skips entries', async () => {
    // Regression guard: a single-pass implementation that deleted while
    // iterating would shift offsets on every page-fetch — SOs originally
    // at position N moved onto already-walked page N-1 once items in front
    // of them were removed. Two-pass shape (collect every page first, then
    // delete) keeps pagination stable because the index isn't mutated
    // while it's being read.
    //
    // We exercise the multi-page path by returning a full page (length
    // === PAGE_SIZE = 100) on the first call so the loop continues to a
    // second page. With the buggy single-pass shape the second page's
    // 50 items would have been skipped entirely.
    const soClient = savedObjectsClientMock.create();
    const pageOne = Array.from({ length: 100 }, (_, i) => ({
      id: `cases-analytics-managed-space-p1-${i}`,
      type: 'index-pattern',
      namespaces: [`space-p1-${i}`],
      attributes: {},
      references: [],
      score: 0,
    }));
    const pageTwo = Array.from({ length: 50 }, (_, i) => ({
      id: `cases-analytics-managed-space-p2-${i}`,
      type: 'index-pattern',
      namespaces: [`space-p2-${i}`],
      attributes: {},
      references: [],
      score: 0,
    }));
    soClient.find
      .mockResolvedValueOnce({
        saved_objects: pageOne,
        total: 150,
        per_page: 100,
        page: 1,
      })
      .mockResolvedValueOnce({
        saved_objects: pageTwo,
        total: 150,
        per_page: 100,
        page: 2,
      });

    const deleted = await deleteAllPerSpaceCasesDataViews(soClient, logger);

    expect(deleted).toBe(150);
    expect(soClient.delete).toHaveBeenCalledTimes(150);
    // All page-two ids made it through — the bug would have dropped them.
    expect(soClient.delete).toHaveBeenCalledWith(
      'index-pattern',
      'cases-analytics-managed-space-p2-49',
      { namespace: 'space-p2-49', force: true }
    );

    // Find is called exactly twice: page-two returned 50 < PAGE_SIZE so
    // the walk terminates. No find calls happen during the delete phase.
    expect(soClient.find).toHaveBeenCalledTimes(2);

    // Sanity check: no `find` calls were interleaved with `delete` calls —
    // the two-pass invariant means every find happens before any delete.
    const findOrder = (soClient.find as jest.Mock).mock.invocationCallOrder;
    const deleteOrder = (soClient.delete as jest.Mock).mock.invocationCallOrder;
    expect(Math.max(...findOrder)).toBeLessThan(Math.min(...deleteOrder));
  });

  it('continues the walk and logs at WARN when a single delete fails', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'cases-analytics-managed-default',
          type: 'index-pattern',
          namespaces: ['default'],
          attributes: {},
          references: [],
          score: 0,
        },
        {
          id: 'cases-analytics-managed-team-a',
          type: 'index-pattern',
          namespaces: ['team-a'],
          attributes: {},
          references: [],
          score: 0,
        },
      ],
      total: 2,
      per_page: 100,
      page: 1,
    });
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
    soClient.delete
      .mockRejectedValueOnce(new Error('transient ES blip'))
      .mockResolvedValueOnce(undefined as unknown as never);

    const deleted = await deleteAllPerSpaceCasesDataViews(soClient, logger);

    // Second delete still ran.
    expect(deleted).toBe(1);
    const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
    const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
    expect(warnCalls.some((m: string) => m.includes('cases-analytics-managed-default'))).toBe(true);
  });

  /**
   * FAILURE SCENARIO: `/reset` floods logs with "Saved object not found"
   *                   WARNs when run from a space that doesn't own the
   *                   data view being deleted (e.g. POST to `/reset` from
   *                   the default space, while data views live in
   *                   `analytics-1`, `analytics-2`, ...).
   * Symptom: WARN per per-space data view: `reset: failed to delete data
   *          view cases-analytics-managed-analytics-1 (space=analytics-1):
   *          Saved object [index-pattern/cases-analytics-managed-analytics-1]
   *          not found`. The data view IS gone (the underlying multi-namespace
   *          doc was removed), but the deletion count undercounts and the
   *          operator sees noisy support-bait logs.
   * Trigger: Production deployment running `/reset` against an unscoped
   *          internal SO client, OR a race with a concurrent reset / a Stack
   *          Management UI deletion between the find pass and the delete
   *          pass.
   * Recovery: 404 on the post-enumeration delete is the desired end state;
   *           treat it as success (DEBUG, not WARN).
   */
  it('treats a 404 on delete as a benign race outcome (DEBUG, not WARN)', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'cases-analytics-managed-default',
          type: 'index-pattern',
          namespaces: ['default'],
          attributes: {},
          references: [],
          score: 0,
        },
        {
          id: 'cases-analytics-managed-team-a',
          type: 'index-pattern',
          namespaces: ['team-a'],
          attributes: {},
          references: [],
          score: 0,
        },
      ],
      total: 2,
      per_page: 100,
      page: 1,
    });
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
    // First delete races and 404s (matches the real SO API's error shape:
    // a plain Error whose message contains `Saved object ... not found`,
    // plus a numeric statusCode); second delete succeeds. The function
    // must classify the first as a benign race, not a hard failure.
    const notFoundErr = Object.assign(
      new Error('Saved object [index-pattern/cases-analytics-managed-default] not found'),
      { statusCode: 404 }
    );
    soClient.delete
      .mockRejectedValueOnce(notFoundErr)
      .mockResolvedValueOnce(undefined as unknown as never);

    const deleted = await deleteAllPerSpaceCasesDataViews(soClient, logger);

    // Only the one we actually deleted is counted.
    expect(deleted).toBe(1);
    const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
    // No WARN about the 404 — that's the bug we're guarding against.
    const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
    expect(warnCalls.some((m: string) => m.includes('cases-analytics-managed-default'))).toBe(
      false
    );
    // We DO log at DEBUG so operators can correlate the count gap.
    const debugCalls = (childLogger.debug as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
    expect(debugCalls.some((m: string) => m.includes('cases-analytics-managed-default'))).toBe(
      true
    );
  });

  it('still WARNs on non-404 delete failures (cluster blip is not a race)', async () => {
    // Negative case for the 404 tolerance path: a 503 / 500 from ES must
    // still surface so the operator can investigate. Mirrors the
    // analogous guard on `createAndSave` in `data_view/service.ts`.
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'cases-analytics-managed-default',
          type: 'index-pattern',
          namespaces: ['default'],
          attributes: {},
          references: [],
          score: 0,
        },
      ],
      total: 1,
      per_page: 100,
      page: 1,
    });
    soClient.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });
    soClient.delete.mockRejectedValueOnce(
      Object.assign(new Error('cluster_block_exception'), { statusCode: 503 })
    );

    const deleted = await deleteAllPerSpaceCasesDataViews(soClient, logger);

    expect(deleted).toBe(0);
    const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
    const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
    expect(warnCalls.some((m: string) => m.includes('cluster_block_exception'))).toBe(true);
  });
});
