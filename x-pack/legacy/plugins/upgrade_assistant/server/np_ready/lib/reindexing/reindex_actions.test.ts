/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import moment from 'moment';

import {
  IndexGroup,
  REINDEX_OP_TYPE,
  ReindexSavedObject,
  ReindexStatus,
  ReindexStep,
} from '../../../../common/types';
import { CURRENT_MAJOR_VERSION, PREV_MAJOR_VERSION } from '../../../../common/version';
import { LOCK_WINDOW, ReindexActions, reindexActionsFactory } from './reindex_actions';

describe('ReindexActions', () => {
  let client: jest.Mocked<any>;
  let callCluster: jest.Mock;
  let actions: ReindexActions;

  const unimplemented = (name: string) => () =>
    Promise.reject(`Mock function ${name} was not implemented!`);

  beforeEach(() => {
    client = {
      errors: null,
      create: jest.fn(unimplemented('create')),
      bulkCreate: jest.fn(unimplemented('bulkCreate')),
      delete: jest.fn(unimplemented('delete')),
      find: jest.fn(unimplemented('find')),
      bulkGet: jest.fn(unimplemented('bulkGet')),
      get: jest.fn(unimplemented('get')),
      // Fake update implementation that simply resolves to whatever the update says.
      update: jest.fn((type: string, id: string, attributes: object) =>
        Promise.resolve({ id, attributes } as ReindexSavedObject)
      ) as any,
    };
    callCluster = jest.fn();
    actions = reindexActionsFactory(client, callCluster);
  });

  describe('createReindexOp', () => {
    beforeEach(() => client.create.mockResolvedValue());

    it(`prepends reindexed-v${CURRENT_MAJOR_VERSION} to new name`, async () => {
      await actions.createReindexOp('myIndex');
      expect(client.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: 'myIndex',
        newIndexName: `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`,
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
      });
    });

    it(`prepends reindexed-v${CURRENT_MAJOR_VERSION} to new name, preserving leading period`, async () => {
      await actions.createReindexOp('.internalIndex');
      expect(client.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: '.internalIndex',
        newIndexName: `.reindexed-v${CURRENT_MAJOR_VERSION}-internalIndex`,
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
      });
    });

    // in v5.6, the upgrade assistant appended to the index name instead of prepending
    it(`prepends reindexed-v${CURRENT_MAJOR_VERSION}- and removes reindex appended in v5`, async () => {
      const indexName = 'myIndex-reindexed-v5';
      await actions.createReindexOp(indexName);
      expect(client.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName,
        newIndexName: `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`,
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
      });
    });

    it(`replaces reindexed-v${PREV_MAJOR_VERSION} with reindexed-v${CURRENT_MAJOR_VERSION}`, async () => {
      await actions.createReindexOp(`reindexed-v${PREV_MAJOR_VERSION}-myIndex`);
      expect(client.create).toHaveBeenCalledWith(REINDEX_OP_TYPE, {
        indexName: `reindexed-v${PREV_MAJOR_VERSION}-myIndex`,
        newIndexName: `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`,
        status: ReindexStatus.inProgress,
        lastCompletedStep: ReindexStep.created,
        locked: null,
        reindexTaskId: null,
        reindexTaskPercComplete: null,
        errorMessage: null,
        runningReindexCount: null,
      });
    });
  });

  describe('updateReindexOp', () => {
    it('calls update with the combined attributes', async () => {
      await actions.updateReindexOp(
        {
          type: REINDEX_OP_TYPE,
          id: '9',
          attributes: { indexName: 'hi', locked: moment().format() },
          version: 'foo',
        } as ReindexSavedObject,
        { newIndexName: 'test' }
      );
      expect(client.update).toHaveBeenCalled();
      const args = client.update.mock.calls[0];
      expect(args[0]).toEqual(REINDEX_OP_TYPE);
      expect(args[1]).toEqual('9');
      expect(args[2].indexName).toEqual('hi');
      expect(args[2].newIndexName).toEqual('test');
      expect(args[3]).toEqual({ version: 'foo' });
    });

    it('throws if the reindexOp is not locked', async () => {
      await expect(
        actions.updateReindexOp(
          {
            type: REINDEX_OP_TYPE,
            id: '10',
            attributes: { indexName: 'hi', locked: null },
            version: 'foo',
          } as ReindexSavedObject,
          { newIndexName: 'test' }
        )
      ).rejects.toThrow();
      expect(client.update).not.toHaveBeenCalled();
    });
  });

  describe('runWhileLocked', () => {
    it('locks and unlocks if object is unlocked', async () => {
      const reindexOp = { id: '1', attributes: { locked: null } } as ReindexSavedObject;
      await actions.runWhileLocked(reindexOp, op => Promise.resolve(op));

      expect(client.update).toHaveBeenCalledTimes(2);

      // Locking update call
      const id1 = client.update.mock.calls[0][1];
      const attr1 = client.update.mock.calls[0][2];
      expect(id1).toEqual('1');
      expect(attr1.locked).not.toBeNull();

      // Unlocking update call
      const id2 = client.update.mock.calls[1][1];
      const attr2 = client.update.mock.calls[1][2];
      expect(id2).toEqual('1');
      expect(attr2.locked).toBeNull();
    });

    it("locks and unlocks if object's lock is expired", async () => {
      const reindexOp = {
        id: '1',
        attributes: {
          // Set locked timestamp to timeout + 10 seconds ago
          locked: moment()
            .subtract(LOCK_WINDOW)
            .subtract(moment.duration(10, 'seconds'))
            .format(),
        },
      } as ReindexSavedObject;
      await actions.runWhileLocked(reindexOp, op => Promise.resolve(op));

      expect(client.update).toHaveBeenCalledTimes(2);

      // Locking update call
      const id1 = client.update.mock.calls[0][1];
      const attr1 = client.update.mock.calls[0][2];
      expect(id1).toEqual('1');
      expect(attr1.locked).not.toBeNull();

      // Unlocking update call
      const id2 = client.update.mock.calls[1][1];
      const attr2 = client.update.mock.calls[1][2];
      expect(id2).toEqual('1');
      expect(attr2.locked).toBeNull();
    });

    it('still locks and unlocks if func throws', async () => {
      const reindexOp = { id: '1', attributes: { locked: null } } as ReindexSavedObject;

      await expect(
        actions.runWhileLocked(reindexOp, op => Promise.reject(new Error('IT FAILED!')))
      ).rejects.toThrow('IT FAILED!');

      expect(client.update).toHaveBeenCalledTimes(2);

      // Locking update call
      const id1 = client.update.mock.calls[0][1];
      const attr1 = client.update.mock.calls[0][2];
      expect(id1).toEqual('1');
      expect(attr1.locked).not.toBeNull();

      // Unlocking update call
      const id2 = client.update.mock.calls[1][1];
      const attr2 = client.update.mock.calls[1][2];
      expect(id2).toEqual('1');
      expect(attr2.locked).toBeNull();
    });

    it('throws if lock is not exprired', async () => {
      const reindexOp = {
        id: '1',
        attributes: { locked: moment().format() },
      } as ReindexSavedObject;
      await expect(actions.runWhileLocked(reindexOp, op => Promise.resolve(op))).rejects.toThrow();
    });
  });

  describe('findAllByStatus', () => {
    it('returns saved_objects', async () => {
      client.find.mockResolvedValue({ saved_objects: ['results!'] });
      await expect(actions.findAllByStatus(ReindexStatus.inProgress)).resolves.toEqual([
        'results!',
      ]);
      expect(client.find).toHaveBeenCalledWith({
        type: REINDEX_OP_TYPE,
        search: '0',
        searchFields: ['status'],
      });
    });

    it('handles paging', async () => {
      client.find
        .mockResolvedValueOnce({
          total: 20,
          page: 0,
          per_page: 10,
          saved_objects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        })
        .mockResolvedValueOnce({
          total: 20,
          page: 1,
          per_page: 10,
          saved_objects: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        });

      // Really prettier??
      await expect(actions.findAllByStatus(ReindexStatus.completed)).resolves.toEqual([
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
      ]);
    });
  });

  describe('getFlatSettings', () => {
    it('returns flat settings', async () => {
      callCluster.mockResolvedValueOnce({
        myIndex: {
          settings: { 'index.mySetting': '1' },
          mappings: {},
        },
      });
      await expect(actions.getFlatSettings('myIndex')).resolves.toEqual({
        settings: { 'index.mySetting': '1' },
        mappings: {},
      });
    });

    it('returns null if index does not exist', async () => {
      callCluster.mockResolvedValueOnce({});
      await expect(actions.getFlatSettings('myIndex')).resolves.toBeNull();
    });
  });

  describe('runWhileConsumerLocked', () => {
    Object.entries(IndexGroup).forEach(([typeKey, consumerType]) => {
      describe(`IndexConsumerType.${typeKey}`, () => {
        it('creates the lock doc if it does not exist and executes callback', async () => {
          expect.assertions(3);
          client.get.mockRejectedValueOnce(Boom.notFound()); // mock no ML doc exists yet
          client.create.mockImplementationOnce((type: any, attributes: any, { id }: any) =>
            Promise.resolve({
              type,
              id,
              attributes,
            })
          );

          let flip = false;
          await actions.runWhileIndexGroupLocked(consumerType, async mlDoc => {
            expect(mlDoc.id).toEqual(consumerType);
            expect(mlDoc.attributes.runningReindexCount).toEqual(0);
            flip = true;
            return mlDoc;
          });
          expect(flip).toEqual(true);
        });

        it('fails after 10 attempts to lock', async () => {
          jest.setTimeout(20000); // increase the timeout
          client.get.mockResolvedValue({
            type: REINDEX_OP_TYPE,
            id: consumerType,
            attributes: { mlReindexCount: 0 },
          });

          client.update.mockRejectedValue(new Error('NO LOCKING!'));

          await expect(
            actions.runWhileIndexGroupLocked(consumerType, async m => m)
          ).rejects.toThrow('Could not acquire lock for ML jobs');
          expect(client.update).toHaveBeenCalledTimes(10);

          // Restore default timeout.
          jest.setTimeout(5000);
        });
      });
    });
  });
});
