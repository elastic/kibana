/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { REQUESTS_SAVED_OBJECT_ID, REQUESTS_SAVED_OBJECT_TYPE } from '../../common';
import { RequestsClient } from './requests_client';

describe('RequestsClient', () => {
  const repository = savedObjectsRepositoryMock.create();
  const client = new RequestsClient(repository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('takes the next number by incrementing the counter in Elasticsearch', async () => {
    repository.incrementCounter.mockResolvedValueOnce({ attributes: { count: 7 } } as never);

    await expect(client.next()).resolves.toBe(7);

    expect(repository.incrementCounter).toHaveBeenCalledWith(
      REQUESTS_SAVED_OBJECT_TYPE,
      REQUESTS_SAVED_OBJECT_ID,
      ['count']
    );
  });

  it('reads the latest number taken', async () => {
    repository.get.mockResolvedValueOnce({ attributes: { count: 7 } } as never);

    await expect(client.latest()).resolves.toBe(7);
  });

  it('reads 0 before any number was taken', async () => {
    repository.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(REQUESTS_SAVED_OBJECT_TYPE, 'latest')
    );

    await expect(client.latest()).resolves.toBe(0);
  });

  it('lets other read failures through', async () => {
    repository.get.mockRejectedValueOnce(new Error('elasticsearch is down'));

    await expect(client.latest()).rejects.toThrow('elasticsearch is down');
  });
});
