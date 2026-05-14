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

  it('deletes each managed Cases data view with force: true (required for multi-namespace SOs)', async () => {
    // Regression guard for the version_conflict_engine_exception observed
    // post-/reset: `index-pattern` is `namespaceType: 'multiple'`, and
    // without `force: true` a `delete` can leave the underlying ES doc
    // behind. The next `createAndSave` then 409s on the deterministic id.
    // The data-views plugin's own SO wrapper passes `force: true` for the
    // same reason — we mirror that here.
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
      expect.objectContaining({ namespace: 'default', force: true })
    );
    expect(soClient.delete).toHaveBeenCalledWith(
      'index-pattern',
      'cases-analytics-managed-team-a',
      expect.objectContaining({ namespace: 'team-a', force: true })
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
