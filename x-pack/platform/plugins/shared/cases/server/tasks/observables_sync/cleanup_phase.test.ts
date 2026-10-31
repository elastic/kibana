/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import type { CasePersistedAttributes } from '../../common/types/case';
import { createObservablesServiceMock } from '../../services/mocks';
import { runCleanupPhase } from './cleanup_phase';
import { OBSERVABLES_SYNC_PAGE_SIZE } from './types';

const observable: Observable = {
  id: 'obs-1',
  typeKey: 'observable-type-ipv4',
  value: '1.1.1.1',
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
};

const foundCase = (id: string, namespace: string, observables: Observable[]) =>
  ({
    id,
    type: CASE_SAVED_OBJECT,
    version: 'v1',
    namespaces: [namespace],
    references: [],
    attributes: { owner: 'securitySolution', observables },
  } as unknown as SavedObject<CasePersistedAttributes>);

const missingCase = (id: string, statusCode = 404) => ({
  id,
  type: CASE_SAVED_OBJECT,
  error: { statusCode, error: 'Not Found', message: 'not found' },
});

describe('runCleanupPhase', () => {
  let repo: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let observablesService: ReturnType<typeof createObservablesServiceMock>;
  let callbacks: { onOutcome: jest.Mock; onOrphan: jest.Mock; onFailure: jest.Mock };
  const logger = loggingSystemMock.createLogger();

  const cleanup = (overrides: Partial<Parameters<typeof runCleanupPhase>[0]> = {}) =>
    runCleanupPhase({
      repo,
      observablesService,
      logger,
      signal: new AbortController().signal,
      caseBudget: Number.MAX_SAFE_INTEGER,
      shouldPause: () => false,
      ...callbacks,
      ...overrides,
    });

  beforeEach(() => {
    repo = savedObjectsRepositoryMock.create();
    observablesService = createObservablesServiceMock();
    callbacks = { onOutcome: jest.fn(), onOrphan: jest.fn(), onFailure: jest.fn() };
    observablesService.syncCase.mockResolvedValue({ created: 0, updated: 0, deleted: 1 });
  });

  it('looks each case up in its own space', async () => {
    observablesService.listCaseKeys.mockResolvedValueOnce({
      cases: [{ caseId: 'case-1', spaceId: 'space-a' }],
    });
    repo.bulkGet.mockResolvedValue({
      saved_objects: [foundCase('case-1', 'space-a', [observable])],
    });

    const result = await cleanup();

    expect(repo.bulkGet).toHaveBeenCalledWith([
      { type: CASE_SAVED_OBJECT, id: 'case-1', namespaces: ['space-a'] },
    ]);
    expect(result).toEqual({ outcome: 'complete', scanned: 1 });
  });

  it('removes the documents of a case that no longer exists', async () => {
    observablesService.listCaseKeys.mockResolvedValueOnce({
      cases: [{ caseId: 'gone', spaceId: 'deleted-space' }],
    });
    repo.bulkGet.mockResolvedValue({ saved_objects: [missingCase('gone')] } as never);
    observablesService.deleteCaseDocuments.mockResolvedValue(4);

    await cleanup();

    expect(observablesService.deleteCaseDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 'gone', spaceId: 'deleted-space' })
    );
    expect(callbacks.onOrphan).toHaveBeenCalledWith(4);
    expect(callbacks.onFailure).not.toHaveBeenCalled();
  });

  it('leaves the documents of a case that still has observables to the copy phase', async () => {
    observablesService.listCaseKeys.mockResolvedValueOnce({
      cases: [{ caseId: 'case-1', spaceId: 'default' }],
    });
    repo.bulkGet.mockResolvedValue({
      saved_objects: [foundCase('case-1', 'default', [observable])],
    });

    await cleanup();

    expect(observablesService.syncCase).not.toHaveBeenCalled();
    expect(observablesService.deleteCaseDocuments).not.toHaveBeenCalled();
    expect(callbacks.onOutcome).not.toHaveBeenCalled();
  });

  it('syncs a case whose observables are empty, which removes its documents', async () => {
    observablesService.listCaseKeys.mockResolvedValueOnce({
      cases: [{ caseId: 'case-1', spaceId: 'default' }],
    });
    repo.bulkGet.mockResolvedValue({ saved_objects: [foundCase('case-1', 'default', [])] });

    await cleanup();

    expect(observablesService.syncCase).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: 'case-1', observables: [] })
    );
    expect(callbacks.onOutcome).toHaveBeenCalledWith({
      status: 'synced',
      created: 0,
      updated: 0,
      deleted: 1,
    });
  });

  it('reports a case it could not process and keeps going', async () => {
    observablesService.listCaseKeys.mockResolvedValueOnce({
      cases: [
        { caseId: 'broken', spaceId: 'default' },
        { caseId: 'gone', spaceId: 'default' },
      ],
    });
    repo.bulkGet.mockResolvedValue({
      saved_objects: [missingCase('broken', 500), missingCase('gone')],
    } as never);

    await cleanup();

    expect(callbacks.onFailure).toHaveBeenCalledWith(
      { caseId: 'broken', spaceId: 'default' },
      expect.any(Error)
    );
    expect(callbacks.onOrphan).toHaveBeenCalledTimes(1);
  });

  it('pauses and returns where to resume when asked to', async () => {
    const after = { caseId: 'case-9', spaceId: 'default' };

    await expect(cleanup({ after, shouldPause: () => true })).resolves.toEqual({
      outcome: 'paused',
      scanned: 0,
      after,
    });
    expect(observablesService.listCaseKeys).not.toHaveBeenCalled();
  });

  it('continues after the last case of the previous page until a short page', async () => {
    const fullPage = Array.from({ length: OBSERVABLES_SYNC_PAGE_SIZE }, (_, index) => ({
      caseId: `case-${index}`,
      spaceId: 'default',
    }));
    const lastKey = fullPage[fullPage.length - 1];
    observablesService.listCaseKeys
      .mockResolvedValueOnce({ cases: fullPage, after: lastKey })
      .mockResolvedValueOnce({ cases: [{ caseId: 'case-x', spaceId: 'default' }] });
    repo.bulkGet.mockImplementation(async (objects) => ({
      saved_objects: objects.map(({ id }) => foundCase(id, 'default', [observable])),
    }));

    const result = await cleanup();

    expect(result).toEqual({ outcome: 'complete', scanned: OBSERVABLES_SYNC_PAGE_SIZE + 1 });
    expect(observablesService.listCaseKeys).toHaveBeenLastCalledWith(
      expect.objectContaining({ after: lastKey })
    );
  });
});
