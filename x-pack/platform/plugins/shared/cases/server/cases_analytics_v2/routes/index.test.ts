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
