/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { taggableTypes, tagSavedObjectTypeName } from '../../../common/constants';
import { createTagMergeTaskRunner } from './task_runner';
import {
  initialTagMergeTaskState,
  type TagMergeTaskParams,
  type TagMergeTaskState,
} from './schemas';

interface MergeRunResult {
  state: TagMergeTaskState;
  runAt?: Date;
}

describe('createTagMergeTaskRunner', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let internalClient: ReturnType<typeof savedObjectsClientMock.create>;
  let typeRegistry: ReturnType<typeof savedObjectsTypeRegistryMock.create>;
  let getCoreStart: jest.Mock;

  const params: TagMergeTaskParams = {
    toId: 'to-1',
    fromIds: ['from-1', 'from-2'],
    deleteSources: false,
  };

  const runWith = async (
    state: TagMergeTaskState,
    overrides: Parameters<typeof taskManagerMock.createRunContext>[0] = {}
  ): Promise<MergeRunResult> => {
    const context = taskManagerMock.createRunContext({
      taskInstance: taskManagerMock.createTask({ params, state }),
      fakeRequest: httpServerMock.createKibanaRequest(),
      ...overrides,
    });
    const result = await createTagMergeTaskRunner(getCoreStart)(context).run();
    // production code always returns a full result; the wider `RunResult | undefined | void`
    // signature only accommodates task types that legitimately return nothing.
    return result as MergeRunResult;
  };

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    internalClient = savedObjectsClientMock.create();
    typeRegistry = savedObjectsTypeRegistryMock.create();
    // pretend every known taggable type is registered in this deployment
    typeRegistry.getType.mockImplementation((type) => ({ name: type } as any));

    const core = coreMock.createStart();
    core.savedObjects.getScopedClient.mockReturnValue(soClient);
    core.savedObjects.getUnsafeInternalClient.mockReturnValue(internalClient);
    core.savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);
    getCoreStart = jest.fn().mockResolvedValue(core);
  });

  describe('top-level guards', () => {
    it('throws an unrecoverable error when no `fakeRequest` was provided', async () => {
      await expect(runWith(initialTagMergeTaskState(), { fakeRequest: undefined })).rejects.toThrow(
        /missing its scoped request/
      );
      expect(getCoreStart).not.toHaveBeenCalled();
    });

    it('cancels immediately, without touching the saved objects client, when cancelRequested', async () => {
      const state: TagMergeTaskState = {
        ...initialTagMergeTaskState(),
        phase: 'updating',
        cancelRequested: true,
      };

      const result = await runWith(state);

      // `runAt` is required here: a terminal state returned without it is never persisted at
      // all (Task Manager deletes the task immediately instead), so the next status poll would
      // never observe `canceled` — see the comment on this branch in task_runner.ts.
      expect(result.state).toEqual({ ...state, status: 'canceled', phase: 'complete' });
      expect(result.runAt).toBeInstanceOf(Date);
      expect(getCoreStart).not.toHaveBeenCalled();
    });

    it('retries shortly, rather than being deleted, when the abort signal is already tripped', async () => {
      const abortController = new AbortController();
      abortController.abort();
      const state = initialTagMergeTaskState();

      const result = await runWith(state, { abortController });

      // No `runAt` here would get this task deleted outright (see task_runner.ts's comment) even
      // though a transient abort isn't a terminal state — so this must still reschedule.
      expect(result.state).toEqual(state);
      expect(result.runAt).toBeInstanceOf(Date);
      expect(getCoreStart).not.toHaveBeenCalled();
    });
  });

  describe('scanning phase', () => {
    it('sums per-type totals into `totalAffected` and advances to `updating`', async () => {
      soClient.find.mockImplementation(({ type }) =>
        Promise.resolve({
          saved_objects: [],
          page: 1,
          per_page: 0,
          total: type === 'dashboard' ? 4 : 1,
        })
      );

      const result = await runWith(initialTagMergeTaskState());

      expect(result.state.totalAffected).toEqual(4 + (taggableTypes.length - 1) * 1);
      expect(result.state.phase).toEqual('updating');
      expect(result.runAt).toBeInstanceOf(Date);
    });
  });

  describe('updating phase', () => {
    const updatingState: TagMergeTaskState = {
      ...initialTagMergeTaskState(),
      phase: 'updating',
      totalAffected: 10,
    };

    it('rewrites references for the next batch and increments `updatedCount`', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [
          { id: 'obj-1', type: 'dashboard', references: [], attributes: {}, score: 0 },
          { id: 'obj-2', type: 'dashboard', references: [], attributes: {}, score: 0 },
        ],
        total: 2,
        page: 1,
        per_page: 100,
      });
      soClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          { id: 'obj-1', type: 'dashboard', references: [], attributes: {} },
          { id: 'obj-2', type: 'dashboard', references: [], attributes: {} },
        ],
      });

      const result = await runWith(updatingState);

      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(result.state.updatedCount).toEqual(2);
      expect(result.state.phase).toEqual('updating');
      expect(result.runAt).toBeInstanceOf(Date);
    });

    it('records per-object failures from `bulkUpdate` in the error summary without failing the run', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [
          { id: 'obj-1', type: 'dashboard', references: [], attributes: {}, score: 0 },
        ],
        total: 1,
        page: 1,
        per_page: 100,
      });
      soClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'obj-1',
            type: 'dashboard',
            error: { statusCode: 409, message: 'conflict', error: 'Conflict' },
          } as any,
        ],
      });

      const result = await runWith(updatingState);

      expect(result.state.updatedCount).toEqual(0);
      expect(result.state.errors.count).toEqual(1);
      expect(result.state.errors.samples[0]).toContain('conflict');
    });

    it('advances to `complete`/`success` once the batch is empty and `deleteSources` is false', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 100 });

      const result = await runWith(updatingState);

      expect(result.state.phase).toEqual('complete');
      expect(result.state.status).toEqual('success');
    });

    it('advances to `finalizing` once the batch is empty and `deleteSources` is true', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 100 });

      const context = taskManagerMock.createRunContext({
        taskInstance: taskManagerMock.createTask({
          params: { ...params, deleteSources: true },
          state: updatingState,
        }),
        fakeRequest: httpServerMock.createKibanaRequest(),
      });
      const result = (await createTagMergeTaskRunner(getCoreStart)(
        context
      ).run()) as MergeRunResult;

      expect(result.state.phase).toEqual('finalizing');
      expect(result.state.status).toEqual('in_progress');
    });

    it('cancels via the top-level guard before entering the phase at all, once cancelRequested is set', async () => {
      // The next run after `cancelRequested` is set (by the cancel route) sees it via the
      // top-level `run()` guard, which fires before `runUpdatingPhase` — so no further batch is
      // ever processed once cancellation is requested, regardless of which phase the job was in.
      const result = await runWith({ ...updatingState, cancelRequested: true });

      expect(result.state.status).toEqual('canceled');
      expect(result.state.phase).toEqual('complete');
      // one more reschedule so the `canceled` state has a chance to persist and be observed
      // before the following no-op run lets Task Manager clean up the task; see task_runner.ts.
      expect(result.runAt).toBeInstanceOf(Date);
      expect(soClient.find).not.toHaveBeenCalled();
      expect(soClient.bulkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('finalizing phase', () => {
    const finalizingState: TagMergeTaskState = {
      ...initialTagMergeTaskState(),
      phase: 'finalizing',
    };
    const finalizingParams: TagMergeTaskParams = { ...params, deleteSources: true };

    const runFinalizing = async (
      state: TagMergeTaskState,
      overrides = {}
    ): Promise<MergeRunResult> => {
      const context = taskManagerMock.createRunContext({
        taskInstance: taskManagerMock.createTask({ params: finalizingParams, state }),
        fakeRequest: httpServerMock.createKibanaRequest(),
        ...overrides,
      });
      const result = await createTagMergeTaskRunner(getCoreStart)(context).run();
      return result as MergeRunResult;
    };

    it('runs a fresh per-fromId scan and deletes only ids with zero remaining references', async () => {
      // Deliberately on `internalClient`, not `soClient`: the remaining-references safety check
      // must use the unscoped client so it can't under-count references in types the merging
      // user can't `find` — see the comment on this in task_runner.ts.
      internalClient.find.mockImplementation(({ hasReference }) => {
        const id = (hasReference as Array<{ id: string }>)[0].id;
        return Promise.resolve({
          saved_objects: [],
          page: 1,
          per_page: 0,
          total: id === 'from-1' ? 0 : 3,
        });
      });

      const result = await runFinalizing(finalizingState);

      expect(soClient.removeReferencesTo).toHaveBeenCalledWith(tagSavedObjectTypeName, 'from-1');
      expect(soClient.delete).toHaveBeenCalledWith(tagSavedObjectTypeName, 'from-1');
      expect(soClient.delete).not.toHaveBeenCalledWith(tagSavedObjectTypeName, 'from-2');
      expect(result.state.deletion).toEqual([
        { id: 'from-1', deleted: true },
        { id: 'from-2', deleted: false, remainingReferences: 3 },
      ]);
      expect(result.state.phase).toEqual('complete');
      expect(result.state.status).toEqual('success');
      // `runAt` is required here too: without it this terminal state is never persisted (Task
      // Manager deletes the task immediately instead) — same landmine as the cancel branch.
      expect(result.runAt).toBeInstanceOf(Date);
    });

    it('treats a not-found error on delete as already-deleted (idempotent re-run)', async () => {
      internalClient.find.mockResolvedValue({ saved_objects: [], page: 1, per_page: 0, total: 0 });
      soClient.delete.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(tagSavedObjectTypeName, 'from-1')
      );

      const result = await runFinalizing(finalizingState);

      expect(result.state.deletion.every((d) => d.deleted)).toBe(true);
    });

    it('records a real delete error without treating it as success', async () => {
      internalClient.find.mockResolvedValue({ saved_objects: [], page: 1, per_page: 0, total: 0 });
      soClient.delete.mockRejectedValue(new Error('cluster unavailable'));

      const result = await runFinalizing(finalizingState);

      expect(
        result.state.deletion.every((d) => !d.deleted && d.error === 'cluster unavailable')
      ).toBe(true);
    });

    it('stops at the current id when aborted and reschedules a fresh (idempotent) re-run', async () => {
      const abortController = new AbortController();
      let calls = 0;
      internalClient.find.mockImplementation(() => {
        calls += 1;
        if (calls === 1) {
          abortController.abort();
        }
        return Promise.resolve({ saved_objects: [], page: 1, per_page: 0, total: 0 });
      });

      const result = await runFinalizing(finalizingState, { abortController });

      expect(result.state.deletion).toHaveLength(1); // stopped after the first id
      expect(result.state.phase).toEqual('finalizing'); // not yet complete
      expect(result.runAt).toBeInstanceOf(Date);
    });
  });
});
