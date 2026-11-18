/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  MAX_REPORTED_ERRORS,
  STATUS_SAVED_OBJECT_ID,
  STATUS_SAVED_OBJECT_TYPE,
  type BootstrapStatusAttributes,
} from '../../common';
import { StatusClient } from './status_client';

const record = (overrides: Partial<BootstrapStatusAttributes> = {}): BootstrapStatusAttributes => ({
  hash: 'h1',
  status: 'completed',
  kinds: {},
  errors: [],
  ...overrides,
});

describe('StatusClient', () => {
  const repository = savedObjectsRepositoryMock.create();
  const client = new StatusClient(repository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('get', () => {
    it('returns the recorded attributes', async () => {
      repository.get.mockResolvedValueOnce({ attributes: record() } as never);

      await expect(client.get()).resolves.toEqual(record());
      expect(repository.get).toHaveBeenCalledWith(STATUS_SAVED_OBJECT_TYPE, STATUS_SAVED_OBJECT_ID);
    });

    it('returns nothing before any run', async () => {
      repository.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          STATUS_SAVED_OBJECT_TYPE,
          STATUS_SAVED_OBJECT_ID
        )
      );

      await expect(client.get()).resolves.toBeUndefined();
    });

    it('does not hide other errors', async () => {
      repository.get.mockRejectedValueOnce(new Error('elasticsearch is down'));

      await expect(client.get()).rejects.toThrow('elasticsearch is down');
    });
  });

  describe('set', () => {
    it('replaces the record', async () => {
      await client.set(record({ status: 'running' }));

      expect(repository.create).toHaveBeenCalledWith(
        STATUS_SAVED_OBJECT_TYPE,
        record({ status: 'running' }),
        { id: STATUS_SAVED_OBJECT_ID, overwrite: true }
      );
    });

    it('keeps at most the reported error limit', async () => {
      const errors = Array.from({ length: MAX_REPORTED_ERRORS + 5 }, (_, i) => ({
        kind: 'k',
        spaceId: 's',
        message: `m${i}`,
      }));

      await client.set(record({ status: 'failed', errors }));

      const [, attributes] = repository.create.mock.calls[0];
      expect((attributes as BootstrapStatusAttributes).errors).toHaveLength(MAX_REPORTED_ERRORS);
    });

    it('does not hide a failed write', async () => {
      repository.create.mockRejectedValueOnce(new Error('mapping error'));

      await expect(client.set(record())).rejects.toThrow('mapping error');
    });
  });
});
