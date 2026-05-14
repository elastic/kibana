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

  it('deletes each managed Cases data view with force: true and no caller-supplied namespace', async () => {
    // Two invariants:
    //   1. `force: true` — `index-pattern` is `namespaceType: 'multiple'`,
    //      so a raw `delete` can leave the underlying ES doc behind and
    //      the next `createAndSave` 409s on the deterministic id with
    //      `version_conflict_engine_exception`.
    //   2. No caller-supplied `namespace` — the Spaces SO extension owns
    //      namespace selection from the request context; passing
    //      `{ namespace }` throws "Namespace cannot be specified by the
    //      caller when the spaces extension is enabled." `force: true`
    //      already removes the multi-namespace doc fully.
    // Mirrors the data-views plugin's own SO wrapper.
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
      { force: true }
    );
    expect(soClient.delete).toHaveBeenCalledWith(
      'index-pattern',
      'cases-analytics-managed-team-a',
      { force: true }
    );
    // Explicit guard: the spaces extension would throw on these calls.
    for (const call of (soClient.delete as jest.Mock).mock.calls) {
      const opts = call[2] as { namespace?: string };
      expect(opts).not.toHaveProperty('namespace');
    }
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
      { force: true }
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
});
