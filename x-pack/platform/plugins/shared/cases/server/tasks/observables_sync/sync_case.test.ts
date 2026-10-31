/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import type { CasePersistedAttributes } from '../../common/types/case';
import { createObservablesServiceMock } from '../../services/mocks';
import { flagCasePending, syncCaseObservables } from './sync_case';
import { MAX_CASE_SYNC_ATTEMPTS } from './types';

const observable = (id: string, value: string): Observable => ({
  id,
  typeKey: 'observable-type-ipv4',
  value,
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
});

const buildCase = ({
  id = 'case-1',
  namespace = 'default',
  version = 'v1',
  observables = [observable('obs-1', '1.1.1.1')],
}: {
  id?: string;
  namespace?: string;
  version?: string;
  observables?: Observable[];
} = {}) =>
  ({
    id,
    type: CASE_SAVED_OBJECT,
    version,
    namespaces: [namespace],
    references: [],
    attributes: { owner: 'securitySolution', observables },
  } as unknown as SavedObject<CasePersistedAttributes>);

describe('syncCaseObservables', () => {
  let repo: ReturnType<typeof savedObjectsRepositoryMock.create>;
  let observablesService: ReturnType<typeof createObservablesServiceMock>;

  const run = (caseSO = buildCase(), signal?: AbortSignal) =>
    syncCaseObservables({ repo, observablesService, caseSO, signal });

  beforeEach(() => {
    repo = savedObjectsRepositoryMock.create();
    observablesService = createObservablesServiceMock();
    observablesService.syncCase.mockResolvedValue({ created: 1, updated: 0, deleted: 0 });
  });

  it('syncs the index from the case field, then clears the pending flag with the version read', async () => {
    const outcome = await run(buildCase({ version: 'v7' }));

    expect(observablesService.syncCase).toHaveBeenCalledWith({
      caseId: 'case-1',
      spaceId: 'default',
      owner: 'securitySolution',
      observables: [observable('obs-1', '1.1.1.1')],
      source: 'migration',
      signal: undefined,
    });
    expect(repo.update).toHaveBeenCalledWith(
      CASE_SAVED_OBJECT,
      'case-1',
      { observables_sync_pending: false },
      { version: 'v7', refresh: false }
    );
    expect(outcome).toEqual({ status: 'synced', created: 1, updated: 0, deleted: 0 });
  });

  it('uses the space of the case and writes in that namespace', async () => {
    await run(buildCase({ namespace: 'space-a' }));

    expect(observablesService.syncCase).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'space-a' })
    );
    expect(repo.update).toHaveBeenCalledWith(
      CASE_SAVED_OBJECT,
      'case-1',
      { observables_sync_pending: false },
      { namespace: 'space-a', version: 'v1', refresh: false }
    );
  });

  it('syncs an empty index for a case without observables', async () => {
    await run(buildCase({ observables: [] }));

    expect(observablesService.syncCase).toHaveBeenCalledWith(
      expect.objectContaining({ observables: [] })
    );
  });

  it('passes the abort signal to the index sync', async () => {
    const { signal } = new AbortController();

    await run(buildCase(), signal);

    expect(observablesService.syncCase).toHaveBeenCalledWith(expect.objectContaining({ signal }));
  });

  it('reads the case again and syncs it again when it changed during the sync', async () => {
    repo.update.mockRejectedValueOnce(SavedObjectsErrorHelpers.createConflictError('cases', 'c'));
    repo.get.mockResolvedValue(
      buildCase({ version: 'v2', observables: [observable('obs-2', '2.2.2.2')] })
    );

    const outcome = await run(buildCase({ version: 'v1' }));

    expect(repo.get).toHaveBeenCalledWith(CASE_SAVED_OBJECT, 'case-1', {});
    expect(observablesService.syncCase).toHaveBeenCalledTimes(2);
    expect(observablesService.syncCase).toHaveBeenLastCalledWith(
      expect.objectContaining({ observables: [observable('obs-2', '2.2.2.2')] })
    );
    expect(repo.update).toHaveBeenLastCalledWith(
      CASE_SAVED_OBJECT,
      'case-1',
      { observables_sync_pending: false },
      { version: 'v2', refresh: false }
    );
    expect(outcome).toEqual({ status: 'synced', created: 2, updated: 0, deleted: 0 });
  });

  it('flags the case pending without a version once the conflicts use up the attempts', async () => {
    repo.update.mockImplementation(async (_type, _id, attributes) => {
      if ((attributes as { observables_sync_pending: boolean }).observables_sync_pending) {
        return {} as never;
      }
      throw SavedObjectsErrorHelpers.createConflictError('cases', 'case-1');
    });
    repo.get.mockResolvedValue(buildCase({ version: 'v2' }));

    const outcome = await run();

    expect(observablesService.syncCase).toHaveBeenCalledTimes(MAX_CASE_SYNC_ATTEMPTS);
    expect(repo.update).toHaveBeenLastCalledWith(
      CASE_SAVED_OBJECT,
      'case-1',
      { observables_sync_pending: true },
      { refresh: false }
    );
    expect(outcome).toEqual({
      status: 'pending',
      created: MAX_CASE_SYNC_ATTEMPTS,
      updated: 0,
      deleted: 0,
    });
  });

  it('removes the documents of a case that was deleted during the sync', async () => {
    repo.update.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('cases', 'c')
    );
    observablesService.syncCase.mockResolvedValue({ created: 0, updated: 0, deleted: 2 });
    observablesService.deleteCaseDocuments.mockResolvedValue(3);

    const outcome = await run();

    expect(observablesService.deleteCaseDocuments).toHaveBeenCalledWith({
      caseId: 'case-1',
      spaceId: 'default',
      signal: undefined,
    });
    expect(outcome).toEqual({ status: 'case_deleted', deleted: 5 });
  });

  it('removes the documents of a case that was deleted before the second attempt', async () => {
    repo.update.mockRejectedValueOnce(SavedObjectsErrorHelpers.createConflictError('cases', 'c'));
    repo.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('cases', 'c'));

    const outcome = await run();

    expect(observablesService.deleteCaseDocuments).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ status: 'case_deleted' });
  });

  it('throws an error that is not a version conflict', async () => {
    repo.update.mockRejectedValue(new Error('boom'));

    await expect(run()).rejects.toThrow('boom');
    expect(repo.get).not.toHaveBeenCalled();
  });

  it('throws when the index sync fails, leaving the case untouched', async () => {
    observablesService.syncCase.mockRejectedValue(new Error('index down'));

    await expect(run()).rejects.toThrow('index down');
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('flagCasePending', () => {
  it('flags the case without a version check in its space', async () => {
    const repo = savedObjectsRepositoryMock.create();

    await expect(
      flagCasePending({ repo, caseSO: buildCase({ namespace: 'space-a' }) })
    ).resolves.toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      CASE_SAVED_OBJECT,
      'case-1',
      { observables_sync_pending: true },
      { namespace: 'space-a', refresh: false }
    );
  });

  it('reports a failure to flag instead of throwing', async () => {
    const repo = savedObjectsRepositoryMock.create();
    repo.update.mockRejectedValue(new Error('boom'));

    await expect(flagCasePending({ repo, caseSO: buildCase() })).resolves.toBe(false);
  });
});
