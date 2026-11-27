/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { LEDGER_SAVED_OBJECT_TYPE } from '../../common';
import { LedgerClient } from './ledger_client';

describe('LedgerClient', () => {
  const repository = savedObjectsRepositoryMock.create();
  const client = new LedgerClient(repository);

  // Owned before its object was created, so nothing was written yet.
  const owned = { kind: 'data_view', id: 'a', spaces: ['default'] };
  const written = {
    kind: 'data_view',
    id: 'b',
    spaces: ['team'],
    appliedHash: 'h1',
    objectVersion: 'v1',
    objectUpdatedAt: 't1',
    kibanaVersion: '9.4.0',
  };
  const ownedAttributes = { kind: 'data_view', resourceId: 'a', spaces: ['default'] };
  const writtenAttributes = {
    kind: 'data_view',
    resourceId: 'b',
    spaces: ['team'],
    appliedHash: 'h1',
    objectVersion: 'v1',
    objectUpdatedAt: 't1',
    kibanaVersion: '9.4.0',
  };
  const failure = (statusCode: number, message = 'failed') => ({
    id: 'doc-a',
    type: LEDGER_SAVED_OBJECT_TYPE,
    error: { statusCode, message },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('list', () => {
    it('reads every page and closes the finder, even when reading fails', async () => {
      const close = jest.fn();
      repository.createPointInTimeFinder.mockReturnValueOnce({
        async *find() {
          yield { saved_objects: [{ id: 'doc-a', attributes: ownedAttributes }] };
          yield {
            saved_objects: [{ id: 'doc-b', attributes: writtenAttributes }],
          };
        },
        close,
      } as never);

      await expect(client.list()).resolves.toEqual([
        { docId: 'doc-a', entry: owned },
        { docId: 'doc-b', entry: written },
      ]);
      expect(repository.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({ type: LEDGER_SAVED_OBJECT_TYPE })
      );
      expect(close).toHaveBeenCalledTimes(1);

      repository.createPointInTimeFinder.mockReturnValueOnce({
        find: () => ({
          [Symbol.asyncIterator]: () => ({
            next: async () => {
              throw new Error('es down');
            },
          }),
        }),
        close,
      } as never);
      await expect(client.list()).rejects.toThrow('es down');
      expect(close).toHaveBeenCalledTimes(2);
    });
  });

  describe('put', () => {
    it('overwrites, leaving out what was not written', async () => {
      repository.bulkCreate.mockResolvedValueOnce({ saved_objects: [] } as never);

      await client.put([{ docId: 'doc-a', entry: owned }]);

      expect(repository.bulkCreate).toHaveBeenCalledWith(
        [{ type: LEDGER_SAVED_OBJECT_TYPE, id: 'doc-a', attributes: ownedAttributes }],
        { overwrite: true, refresh: 'wait_for' }
      );
    });

    it('throws on a conflict too, since it overwrites', async () => {
      repository.bulkCreate.mockResolvedValueOnce({
        saved_objects: [failure(409)],
      } as never);

      await expect(client.put([{ docId: 'doc-a', entry: owned }])).rejects.toThrow(
        'Could not record 1 ledger entries'
      );
    });
  });

  describe('remove', () => {
    it('deletes the documents and counts one already gone as deleted', async () => {
      repository.bulkDelete.mockResolvedValueOnce({
        statuses: [
          { id: 'doc-a', type: LEDGER_SAVED_OBJECT_TYPE, success: true },
          {
            id: 'doc-b',
            type: LEDGER_SAVED_OBJECT_TYPE,
            success: false,
            error: { statusCode: 404, message: 'gone' },
          },
        ],
      } as never);

      await client.remove(['doc-a', 'doc-b']);

      expect(repository.bulkDelete).toHaveBeenCalledWith(
        [
          { type: LEDGER_SAVED_OBJECT_TYPE, id: 'doc-a' },
          { type: LEDGER_SAVED_OBJECT_TYPE, id: 'doc-b' },
        ],
        { refresh: 'wait_for' }
      );
    });

    it('throws on any other failure', async () => {
      repository.bulkDelete.mockResolvedValueOnce({
        statuses: [
          {
            id: 'doc-a',
            type: LEDGER_SAVED_OBJECT_TYPE,
            success: false,
            error: { statusCode: 500, message: 'boom' },
          },
        ],
      } as never);

      await expect(client.remove(['doc-a'])).rejects.toThrow('boom');
    });

    it('does not call Elasticsearch for nothing', async () => {
      await client.remove([]);

      expect(repository.bulkDelete).not.toHaveBeenCalled();
    });
  });
});
