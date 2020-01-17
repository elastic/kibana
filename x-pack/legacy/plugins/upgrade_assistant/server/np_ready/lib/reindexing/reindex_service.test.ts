/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IndexGroup,
  ReindexOperation,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from '../../../../common/types';
import { CURRENT_MAJOR_VERSION, PREV_MAJOR_VERSION } from '../../../../common/version';
import {
  isMlIndex,
  isWatcherIndex,
  ReindexService,
  reindexServiceFactory,
} from './reindex_service';

describe('reindexService', () => {
  let actions: jest.Mocked<any>;
  let callCluster: jest.Mock;
  let log: jest.Mock;
  let xpackInfo: { feature: jest.Mocked<any> };
  let service: ReindexService;

  const updateMockImpl = (reindexOp: ReindexSavedObject, attrs: Partial<ReindexOperation> = {}) =>
    Promise.resolve({
      ...reindexOp,
      attributes: { ...reindexOp.attributes, ...attrs },
    } as ReindexSavedObject);

  const unimplemented = (name: string) => () =>
    Promise.reject(`Mock function ${name} was not implemented!`);

  beforeEach(() => {
    actions = {
      createReindexOp: jest.fn(unimplemented('createReindexOp')),
      deleteReindexOp: jest.fn(unimplemented('deleteReindexOp')),
      updateReindexOp: jest.fn(updateMockImpl),
      runWhileLocked: jest.fn((reindexOp: any, func: any) => func(reindexOp)),
      findReindexOperations: jest.fn(unimplemented('findReindexOperations')),
      findAllByStatus: jest.fn(unimplemented('findAllInProgressOperations')),
      getFlatSettings: jest.fn(unimplemented('getFlatSettings')),
      cleanupChanges: jest.fn(),
      incrementIndexGroupReindexes: jest.fn(unimplemented('incrementIndexGroupReindexes')),
      decrementIndexGroupReindexes: jest.fn(unimplemented('decrementIndexGroupReindexes')),
      runWhileIndexGroupLocked: jest.fn(async (group: string, f: any) => f({ attributes: {} })),
    };
    callCluster = jest.fn();
    log = jest.fn();
    xpackInfo = {
      feature: jest.fn(() => ({
        isAvailable() {
          return true;
        },
        isEnabled() {
          return true;
        },
      })),
    };

    service = reindexServiceFactory(callCluster as any, xpackInfo as any, actions, log);
  });

  describe('hasRequiredPrivileges', () => {
    it('returns true if security is disabled', async () => {
      xpackInfo.feature.mockReturnValueOnce({
        isAvailable() {
          return true;
        },
        isEnabled() {
          return false;
        },
      });

      const hasRequired = await service.hasRequiredPrivileges('anIndex');
      expect(hasRequired).toBe(true);
    });

    it('calls security API with basic requirements', async () => {
      callCluster.mockResolvedValueOnce({ has_all_requested: true });

      const hasRequired = await service.hasRequiredPrivileges('anIndex');
      expect(hasRequired).toBe(true);
      expect(callCluster).toHaveBeenCalledWith('transport.request', {
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          cluster: ['manage'],
          index: [
            {
              names: ['anIndex', `reindexed-v${CURRENT_MAJOR_VERSION}-anIndex`],
              allow_restricted_indices: true,
              privileges: ['all'],
            },
            {
              names: ['.tasks'],
              privileges: ['read', 'delete'],
            },
          ],
        },
      });
    });

    it('includes manage_ml for ML indices', async () => {
      callCluster.mockResolvedValueOnce({ has_all_requested: true });

      await service.hasRequiredPrivileges('.ml-anomalies');
      expect(callCluster).toHaveBeenCalledWith('transport.request', {
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          cluster: ['manage', 'manage_ml'],
          index: [
            {
              names: ['.ml-anomalies', `.reindexed-v${CURRENT_MAJOR_VERSION}-ml-anomalies`],
              allow_restricted_indices: true,
              privileges: ['all'],
            },
            {
              names: ['.tasks'],
              privileges: ['read', 'delete'],
            },
          ],
        },
      });
    });

    it('includes checking for permissions on the baseName which could be an alias', async () => {
      callCluster.mockResolvedValueOnce({ has_all_requested: true });

      const hasRequired = await service.hasRequiredPrivileges(
        `reindexed-v${PREV_MAJOR_VERSION}-anIndex`
      );
      expect(hasRequired).toBe(true);
      expect(callCluster).toHaveBeenCalledWith('transport.request', {
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          cluster: ['manage'],
          index: [
            {
              names: [
                `reindexed-v${PREV_MAJOR_VERSION}-anIndex`,
                `reindexed-v${CURRENT_MAJOR_VERSION}-anIndex`,
                'anIndex',
              ],
              allow_restricted_indices: true,
              privileges: ['all'],
            },
            {
              names: ['.tasks'],
              privileges: ['read', 'delete'],
            },
          ],
        },
      });
    });

    it('includes manage_watcher for watcher indices', async () => {
      callCluster.mockResolvedValueOnce({ has_all_requested: true });

      await service.hasRequiredPrivileges('.watches');
      expect(callCluster).toHaveBeenCalledWith('transport.request', {
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          cluster: ['manage', 'manage_watcher'],
          index: [
            {
              names: ['.watches', `.reindexed-v${CURRENT_MAJOR_VERSION}-watches`],
              allow_restricted_indices: true,
              privileges: ['all'],
            },
            {
              names: ['.tasks'],
              privileges: ['read', 'delete'],
            },
          ],
        },
      });
    });
  });

  describe('detectReindexWarnings', () => {
    it('fetches reindex warnings from flat settings', async () => {
      const indexName = 'myIndex';
      actions.getFlatSettings.mockResolvedValueOnce({
        settings: {
          'index.provided_name': indexName,
        },
        mappings: {
          properties: { https: { type: 'boolean' } },
        },
      });

      const reindexWarnings = await service.detectReindexWarnings(indexName);
      expect(reindexWarnings).toEqual([]);
    });

    it('returns null if index does not exist', async () => {
      actions.getFlatSettings.mockResolvedValueOnce(null);
      const reindexWarnings = await service.detectReindexWarnings('myIndex');
      expect(reindexWarnings).toBeNull();
    });
  });

  describe('createReindexOperation', () => {
    it('creates new reindex operation', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({ total: 0 });
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');

      expect(actions.createReindexOp).toHaveBeenCalledWith('myIndex');
    });

    it('fails if index does not exist', async () => {
      callCluster.mockResolvedValueOnce(false); // indices.exist
      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.createReindexOp).not.toHaveBeenCalled();
    });

    it('deletes existing operation if it failed', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.failed } }],
        total: 1,
      });
      actions.deleteReindexOp.mockResolvedValueOnce();
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');
      expect(actions.deleteReindexOp).toHaveBeenCalledWith({
        id: 1,
        attributes: { status: ReindexStatus.failed },
      });
    });

    it('deletes existing operation if it was cancelled', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.cancelled } }],
        total: 1,
      });
      actions.deleteReindexOp.mockResolvedValueOnce();
      actions.createReindexOp.mockResolvedValueOnce();

      await service.createReindexOperation('myIndex');
      expect(actions.deleteReindexOp).toHaveBeenCalledWith({
        id: 1,
        attributes: { status: ReindexStatus.cancelled },
      });
    });

    it('fails if existing operation did not fail', async () => {
      callCluster.mockResolvedValueOnce(true); // indices.exist
      actions.findReindexOperations.mockResolvedValueOnce({
        saved_objects: [{ id: 1, attributes: { status: ReindexStatus.inProgress } }],
        total: 1,
      });

      await expect(service.createReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.deleteReindexOp).not.toHaveBeenCalled();
      expect(actions.createReindexOp).not.toHaveBeenCalled();
    });
  });

  describe('findReindexOperation', () => {
    it('returns the only result', async () => {
      actions.findReindexOperations.mockResolvedValue({ total: 1, saved_objects: ['fake object'] });
      await expect(service.findReindexOperation('myIndex')).resolves.toEqual('fake object');
    });

    it('returns null if there are no results', async () => {
      actions.findReindexOperations.mockResolvedValue({ total: 0 });
      await expect(service.findReindexOperation('myIndex')).resolves.toBeNull();
    });

    it('fails if there is more than 1 result', async () => {
      actions.findReindexOperations.mockResolvedValue({ total: 2 });
      await expect(service.findReindexOperation('myIndex')).rejects.toThrow();
    });
  });

  describe('processNextStep', () => {
    describe('locking', () => {
      // These tests depend on an implementation detail that if no status is set, the state machine
      // is not activated, just the locking mechanism.

      it('runs with runWhileLocked', async () => {
        const reindexOp = { id: '1', attributes: { locked: null } } as ReindexSavedObject;
        await service.processNextStep(reindexOp);

        expect(actions.runWhileLocked).toHaveBeenCalled();
      });
    });
  });

  describe('pauseReindexOperation', () => {
    it('runs with runWhileLocked', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.inProgress },
      } as any);

      await service.pauseReindexOperation('myIndex');

      expect(actions.runWhileLocked).toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('sets the status to paused', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.inProgress },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.pauseReindexOperation('myIndex')).resolves.toEqual({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.paused },
      });

      expect(findSpy).toHaveBeenCalledWith('myIndex');
      expect(actions.updateReindexOp).toHaveBeenCalledWith(reindexOp, {
        status: ReindexStatus.paused,
      });
      findSpy.mockRestore();
    });

    it('throws if reindexOp is not inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.failed },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.pauseReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('throws if reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.pauseReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });
  });

  describe('resumeReindexOperation', () => {
    it('runs with runWhileLocked', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.paused },
      } as any);

      await service.resumeReindexOperation('myIndex');

      expect(actions.runWhileLocked).toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('sets the status to inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.paused },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.resumeReindexOperation('myIndex')).resolves.toEqual({
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.inProgress },
      });

      expect(findSpy).toHaveBeenCalledWith('myIndex');
      expect(actions.updateReindexOp).toHaveBeenCalledWith(reindexOp, {
        status: ReindexStatus.inProgress,
      });
      findSpy.mockRestore();
    });

    it('throws if reindexOp is not inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.failed },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.resumeReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });

    it('throws if reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.resumeReindexOperation('myIndex')).rejects.toThrow();
      expect(actions.updateReindexOp).not.toHaveBeenCalled();
      findSpy.mockRestore();
    });
  });

  describe('cancelReindexing', () => {
    it('cancels the reindex task', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce({
        id: '2',
        attributes: {
          indexName: 'myIndex',
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskId: '999333',
        },
      } as any);
      callCluster.mockResolvedValueOnce(true);

      await service.cancelReindexing('myIndex');
      expect(callCluster).toHaveBeenCalledWith('tasks.cancel', { taskId: '999333' });
      findSpy.mockRestore();
    });

    it('throws if reindexOp status is not inProgress', async () => {
      const reindexOp = {
        id: '2',
        attributes: { indexName: 'myIndex', status: ReindexStatus.failed, reindexTaskId: '999333' },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.cancelReindexing('myIndex')).rejects.toThrow();
      expect(callCluster).not.toHaveBeenCalledWith('tasks.cancel', { taskId: '999333' });
      findSpy.mockRestore();
    });

    it('throws if reindexOp lastCompletedStep is not reindexStarted', async () => {
      const reindexOp = {
        id: '2',
        attributes: {
          indexName: 'myIndex',
          status: ReindexStatus.inProgress,
          lastCompletedStep: ReindexStep.reindexCompleted,
          reindexTaskId: '999333',
        },
      } as ReindexSavedObject;
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(reindexOp);

      await expect(service.cancelReindexing('myIndex')).rejects.toThrow();
      expect(callCluster).not.toHaveBeenCalledWith('tasks.cancel', { taskId: '999333' });
      findSpy.mockRestore();
    });

    it('throws if reindex operation does not exist', async () => {
      const findSpy = jest.spyOn(service, 'findReindexOperation').mockResolvedValueOnce(null);
      await expect(service.cancelReindexing('myIndex')).rejects.toThrow();
      findSpy.mockRestore();
    });
  });

  describe('isMlIndex', () => {
    it('is false for non-ml indices', () => {
      expect(isMlIndex('.literally-anything')).toBe(false);
    });

    it('is true for ML indices', () => {
      expect(isMlIndex('.ml-state')).toBe(true);
      expect(isMlIndex('.ml-anomalies')).toBe(true);
      expect(isMlIndex('.ml-config')).toBe(true);
    });

    it('is true for ML re-indexed indices', () => {
      expect(isMlIndex(`.reindexed-v${PREV_MAJOR_VERSION}-ml-state`)).toBe(true);
      expect(isMlIndex(`.reindexed-v${PREV_MAJOR_VERSION}-ml-anomalies`)).toBe(true);
      expect(isMlIndex(`.reindexed-v${PREV_MAJOR_VERSION}-ml-config`)).toBe(true);
    });
  });

  describe('isWatcherIndex', () => {
    it('is false for non-watcher indices', () => {
      expect(isWatcherIndex('.literally-anything')).toBe(false);
    });

    it('is true for watcher indices', () => {
      expect(isWatcherIndex('.watches')).toBe(true);
      expect(isWatcherIndex('.triggered-watches')).toBe(true);
    });

    it('is true for watcher re-indexed indices', () => {
      expect(isWatcherIndex(`.reindexed-v${PREV_MAJOR_VERSION}-watches`)).toBe(true);
      expect(isWatcherIndex(`.reindexed-v${PREV_MAJOR_VERSION}-triggered-watches`)).toBe(true);
    });
  });

  describe('state machine, lastCompletedStep ===', () => {
    const defaultAttributes = {
      indexName: 'myIndex',
      newIndexName: 'myIndex-reindex-0',
      status: ReindexStatus.inProgress,
    };
    const settingsMappings = {
      settings: { 'index.number_of_replicas': 7, 'index.blocks.write': true },
      mappings: { _doc: { properties: { timestampl: { type: 'date' } } } },
    };

    describe('created', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.created },
      } as ReindexSavedObject;

      describe('ml behavior', () => {
        const mlReindexOp = {
          id: '2',
          attributes: { ...reindexOp.attributes, indexName: '.ml-anomalies' },
        } as ReindexSavedObject;

        it('does nothing if index is not an ML index', async () => {
          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStopped
          );
          expect(actions.incrementIndexGroupReindexes).not.toHaveBeenCalled();
          expect(actions.runWhileIndexGroupLocked).not.toHaveBeenCalled();
          expect(callCluster).not.toHaveBeenCalled();
        });

        it('supports an already migrated ML index', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f()
          );
          callCluster
            // Mock call to /_nodes for version check
            .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.7.0-alpha' } } })
            // Mock call to /_ml/set_upgrade_mode?enabled=true
            .mockResolvedValueOnce({ acknowledged: true });

          const mlReindexedOp = {
            id: '2',
            attributes: { ...reindexOp.attributes, indexName: '.reindexed-v7-ml-anomalies' },
          } as ReindexSavedObject;
          const updatedOp = await service.processNextStep(mlReindexedOp);

          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStopped
          );
          expect(actions.incrementIndexGroupReindexes).toHaveBeenCalled();
          expect(actions.runWhileIndexGroupLocked).toHaveBeenCalled();
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=true',
            method: 'POST',
          });
        });

        it('increments ML reindexes and calls ML stop endpoint', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f()
          );
          callCluster
            // Mock call to /_nodes for version check
            .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.7.0-alpha' } } })
            // Mock call to /_ml/set_upgrade_mode?enabled=true
            .mockResolvedValueOnce({ acknowledged: true });

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStopped
          );
          expect(actions.incrementIndexGroupReindexes).toHaveBeenCalled();
          expect(actions.runWhileIndexGroupLocked).toHaveBeenCalled();
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=true',
            method: 'POST',
          });
        });

        it('fails if ML reindexes cannot be incremented', async () => {
          actions.incrementIndexGroupReindexes.mockRejectedValueOnce(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=true',
            method: 'POST',
          });
        });

        it('fails if ML doc cannot be locked', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockRejectedValueOnce(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=true',
            method: 'POST',
          });
        });

        it('fails if ML endpoint fails', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f()
          );
          callCluster
            // Mock call to /_nodes for version check
            .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.7.0' } } })
            // Mock call to /_ml/set_upgrade_mode?enabled=true
            .mockResolvedValueOnce({ acknowledged: false });

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(
            updatedOp.attributes.errorMessage!.includes('Could not stop ML jobs')
          ).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=true',
            method: 'POST',
          });
        });

        it('fails if not all nodes have been upgraded to 6.7.0', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f()
          );
          callCluster
            // Mock call to /_nodes for version check
            .mockResolvedValueOnce({ nodes: { nodeX: { version: '6.6.0' } } });

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(
            updatedOp.attributes.errorMessage!.includes('Some nodes are not on minimum version')
          ).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          // Should not have called ML endpoint at all
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=true',
            method: 'POST',
          });
        });
      });

      describe('watcher behavior', () => {
        const watcherReindexOp = {
          id: '2',
          attributes: { ...reindexOp.attributes, indexName: '.watches' },
        } as ReindexSavedObject;

        it('does nothing if index is not a watcher index', async () => {
          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStopped
          );
          expect(actions.incrementIndexGroupReindexes).not.toHaveBeenCalled();
          expect(actions.runWhileIndexGroupLocked).not.toHaveBeenCalled();
          expect(callCluster).not.toHaveBeenCalled();
        });

        it('increments ML reindexes and calls watcher stop endpoint', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (type: string, f: any) =>
            f()
          );
          callCluster
            // Mock call to /_watcher/_stop
            .mockResolvedValueOnce({ acknowledged: true });

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStopped
          );
          expect(actions.incrementIndexGroupReindexes).toHaveBeenCalledWith(IndexGroup.watcher);
          expect(actions.runWhileIndexGroupLocked).toHaveBeenCalled();
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_stop',
            method: 'POST',
          });
        });

        it('fails if watcher reindexes cannot be incremented', async () => {
          actions.incrementIndexGroupReindexes.mockRejectedValueOnce(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_stop',
            method: 'POST',
          });
        });

        it('fails if watcher doc cannot be locked', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockRejectedValueOnce(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_stop',
            method: 'POST',
          });
        });

        it('fails if watcher endpoint fails', async () => {
          actions.incrementIndexGroupReindexes.mockResolvedValueOnce();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (type: string, f: any) =>
            f()
          );
          callCluster
            // Mock call to /_watcher/_stop
            .mockResolvedValueOnce({ acknowledged: false });

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.created);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(
            updatedOp.attributes.errorMessage!.includes('Could not stop Watcher')
          ).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_stop',
            method: 'POST',
          });
        });
      });
    });

    describe('indexConsumersStopped', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.indexGroupServicesStopped,
        },
      } as ReindexSavedObject;

      it('blocks writes and updates lastCompletedStep', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(callCluster).toHaveBeenCalledWith('indices.putSettings', {
          index: 'myIndex',
          body: { 'index.blocks.write': true },
        });
      });

      it('fails if setting updates are not acknowledged', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(
          ReindexStep.indexGroupServicesStopped
        );
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
      });

      it('fails if setting updates fail', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(
          ReindexStep.indexGroupServicesStopped
        );
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
      });
    });

    describe('readonly', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.readonly },
      } as ReindexSavedObject;

      // The more intricate details of how the settings are chosen are test separately.
      it('creates new index with settings and mappings and updates lastCompletedStep', async () => {
        actions.getFlatSettings.mockResolvedValueOnce(settingsMappings);
        callCluster.mockResolvedValueOnce({ acknowledged: true }); // indices.create

        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.create', {
          index: 'myIndex-reindex-0',
          body: {
            // index.blocks.write should be removed from the settings for the new index.
            settings: { 'index.number_of_replicas': 7 },
            mappings: settingsMappings.mappings,
          },
        });
      });

      it('fails if create index is not acknowledged', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: settingsMappings })
          .mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
      });

      it('fails if create index fails', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: settingsMappings })
          .mockRejectedValueOnce(new Error(`blah!`))
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.readonly);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));

        // Original index should have been set back to allow reads.
        expect(callCluster).toHaveBeenCalledWith('indices.putSettings', {
          index: 'myIndex',
          body: { 'index.blocks.write': false },
        });
      });
    });

    describe('newIndexCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.newIndexCreated },
      } as ReindexSavedObject;

      beforeEach(() => {
        actions.getFlatSettings.mockResolvedValueOnce({
          settings: {},
          mappings: {},
        });
      });

      it('starts reindex, saves taskId, and updates lastCompletedStep', async () => {
        callCluster.mockResolvedValueOnce({ task: 'xyz' }); // reindex
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
        expect(updatedOp.attributes.reindexTaskId).toEqual('xyz');
        expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0);
        expect(callCluster).toHaveBeenLastCalledWith('reindex', {
          refresh: true,
          waitForCompletion: false,
          body: {
            source: { index: 'myIndex' },
            dest: { index: 'myIndex-reindex-0' },
          },
        });
      });

      it('fails if starting reindex fails', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!')).mockResolvedValueOnce({});
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.newIndexCreated);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
      });
    });

    describe('reindexStarted', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.reindexStarted,
          reindexTaskId: 'xyz',
        },
      } as ReindexSavedObject;

      describe('reindex task is not complete', () => {
        it('updates reindexTaskPercComplete', async () => {
          callCluster.mockResolvedValueOnce({
            completed: false,
            task: { status: { created: 10, total: 100 } },
          });
          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(0.1); // 10 / 100 = 0.1
        });
      });

      describe('reindex task is complete', () => {
        it('deletes task, updates reindexTaskPercComplete, updates lastCompletedStep', async () => {
          callCluster
            .mockResolvedValueOnce({
              completed: true,
              task: { status: { created: 100, total: 100 } },
            })
            .mockResolvedValueOnce({ count: 100 })
            .mockResolvedValueOnce({ result: 'deleted' });

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
          expect(updatedOp.attributes.reindexTaskPercComplete).toEqual(1);
          expect(callCluster).toHaveBeenCalledWith('delete', {
            index: '.tasks',
            id: 'xyz',
          });
        });

        it('fails if docs created is less than count in source index', async () => {
          callCluster
            .mockResolvedValueOnce({
              completed: true,
              task: { status: { created: 95, total: 95 } },
            })
            .mockReturnValueOnce({ count: 100 });

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage).not.toBeNull();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
        });
      });

      describe('reindex task is cancelled', () => {
        it('deletes tsk, updates status to cancelled', async () => {
          callCluster
            .mockResolvedValueOnce({
              completed: true,
              task: { status: { created: 100, total: 100, canceled: 'by user request' } },
            })
            .mockResolvedValue({ result: 'deleted' });

          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexStarted);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.cancelled);
          expect(callCluster).toHaveBeenCalledWith('delete', {
            index: '.tasks',
            id: 'xyz',
          });
        });
      });
    });

    describe('reindexCompleted', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.reindexCompleted },
      } as ReindexSavedObject;

      it('switches aliases, sets as complete, and updates lastCompletedStep', async () => {
        callCluster
          .mockResolvedValueOnce({ myIndex: { aliases: {} } })
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
          body: {
            actions: [
              { add: { index: 'myIndex-reindex-0', alias: 'myIndex' } },
              { remove_index: { index: 'myIndex' } },
            ],
          },
        });
      });

      it('moves existing aliases over to new index', async () => {
        callCluster
          .mockResolvedValueOnce({
            myIndex: {
              aliases: {
                myAlias: {},
                myFilteredAlias: { filter: { term: { https: true } } },
              },
            },
          })
          .mockResolvedValueOnce({ acknowledged: true });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
        expect(callCluster).toHaveBeenCalledWith('indices.updateAliases', {
          body: {
            actions: [
              { add: { index: 'myIndex-reindex-0', alias: 'myIndex' } },
              { remove_index: { index: 'myIndex' } },
              { add: { index: 'myIndex-reindex-0', alias: 'myAlias' } },
              {
                add: {
                  index: 'myIndex-reindex-0',
                  alias: 'myFilteredAlias',
                  filter: { term: { https: true } },
                },
              },
            ],
          },
        });
      });

      it('fails if switching aliases is not acknowledged', async () => {
        callCluster.mockResolvedValueOnce({ acknowledged: false });
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
      });

      it('fails if switching aliases fails', async () => {
        callCluster.mockRejectedValueOnce(new Error('blah!'));
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.reindexCompleted);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
        expect(updatedOp.attributes.errorMessage).not.toBeNull();
        expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
      });
    });

    describe('aliasCreated', () => {
      const reindexOp = {
        id: '1',
        attributes: { ...defaultAttributes, lastCompletedStep: ReindexStep.aliasCreated },
      } as ReindexSavedObject;

      describe('ml behavior', () => {
        const mlReindexOp = {
          id: '2',
          attributes: { ...reindexOp.attributes, indexName: '.ml-anomalies' },
        } as ReindexSavedObject;

        it('does nothing if index is not an ML index', async () => {
          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStarted
          );
          expect(callCluster).not.toHaveBeenCalled();
        });

        it('decrements ML reindexes and calls ML start endpoint if no remaining ML jobs', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f({ attributes: { runningReindexCount: 0 } })
          );
          // Mock call to /_ml/set_upgrade_mode?enabled=false
          callCluster.mockResolvedValueOnce({ acknowledged: true });

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(actions.decrementIndexGroupReindexes).toHaveBeenCalledWith(IndexGroup.ml);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStarted
          );
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=false',
            method: 'POST',
          });
        });

        it('does not call ML start endpoint if there are remaining ML jobs', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f({ attributes: { runningReindexCount: 2 } })
          );
          // Mock call to /_ml/set_upgrade_mode?enabled=false
          callCluster.mockResolvedValueOnce({ acknowledged: true });

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStarted
          );
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=false',
            method: 'POST',
          });
        });

        it('fails if ML reindexes cannot be decremented', async () => {
          // Mock unable to lock ml doc
          actions.decrementIndexGroupReindexes.mockRejectedValue(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=false',
            method: 'POST',
          });
        });

        it('fails if ML doc cannot be locked', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          // Mock unable to lock ml doc
          actions.runWhileIndexGroupLocked.mockRejectedValueOnce(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=false',
            method: 'POST',
          });
        });

        it('fails if ML endpoint fails', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f({ attributes: { runningReindexCount: 0 } })
          );
          // Mock call to /_ml/set_upgrade_mode?enabled=true
          callCluster.mockResolvedValueOnce({ acknowledged: false });

          const updatedOp = await service.processNextStep(mlReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(
            updatedOp.attributes.errorMessage!.includes('Could not resume ML jobs')
          ).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_ml/set_upgrade_mode?enabled=false',
            method: 'POST',
          });
        });
      });

      describe('watcher behavior', () => {
        const watcherReindexOp = {
          id: '2',
          attributes: { ...reindexOp.attributes, indexName: '.watches' },
        } as ReindexSavedObject;

        it('does nothing if index is not a watcher index', async () => {
          const updatedOp = await service.processNextStep(reindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStarted
          );
          expect(callCluster).not.toHaveBeenCalled();
        });

        it('decrements watcher reindexes and calls wathcer start endpoint if no remaining watcher reindexes', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f({ attributes: { runningReindexCount: 0 } })
          );
          // Mock call to /_watcher/_start
          callCluster.mockResolvedValueOnce({ acknowledged: true });

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(actions.decrementIndexGroupReindexes).toHaveBeenCalledWith(IndexGroup.watcher);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStarted
          );
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_start',
            method: 'POST',
          });
        });

        it('does not call wathcer start endpoint if there are remaining wathcer reindexes', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f({ attributes: { runningReindexCount: 2 } })
          );
          // Mock call to /_watcher/_start
          callCluster.mockResolvedValueOnce({ acknowledged: true });

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(
            ReindexStep.indexGroupServicesStarted
          );
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_start',
            method: 'POST',
          });
        });

        it('fails if watcher reindexes cannot be decremented', async () => {
          // Mock unable to lock watcher doc
          actions.decrementIndexGroupReindexes.mockRejectedValue(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_start',
            method: 'POST',
          });
        });

        it('fails if watcher doc cannot be locked', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          // Mock unable to lock watcher doc
          actions.runWhileIndexGroupLocked.mockRejectedValueOnce(new Error(`Can't lock!`));

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(updatedOp.attributes.errorMessage!.includes(`Can't lock!`)).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).not.toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_start',
            method: 'POST',
          });
        });

        it('fails if watcher endpoint fails', async () => {
          actions.decrementIndexGroupReindexes.mockResolvedValue();
          actions.runWhileIndexGroupLocked.mockImplementationOnce(async (group: string, f: any) =>
            f({ attributes: { runningReindexCount: 0 } })
          );
          // Mock call to /_watcher/_start
          callCluster.mockResolvedValueOnce({ acknowledged: false });

          const updatedOp = await service.processNextStep(watcherReindexOp);
          expect(updatedOp.attributes.lastCompletedStep).toEqual(ReindexStep.aliasCreated);
          expect(updatedOp.attributes.status).toEqual(ReindexStatus.failed);
          expect(
            updatedOp.attributes.errorMessage!.includes('Could not start Watcher')
          ).toBeTruthy();
          expect(log).toHaveBeenCalledWith(['upgrade_assistant', 'error'], expect.any(String));
          expect(callCluster).toHaveBeenCalledWith('transport.request', {
            path: '/_watcher/_start',
            method: 'POST',
          });
        });
      });
    });

    describe('indexGroupServicesStarted', () => {
      const reindexOp = {
        id: '1',
        attributes: {
          ...defaultAttributes,
          lastCompletedStep: ReindexStep.indexGroupServicesStarted,
        },
      } as ReindexSavedObject;

      it('sets to completed', async () => {
        const updatedOp = await service.processNextStep(reindexOp);
        expect(updatedOp.attributes.status).toEqual(ReindexStatus.completed);
      });
    });
  });
});
