/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { flushTaskProvisioningStatus } from './flush_task_provisioning_status';

const createSoClientMock = () =>
  ({
    find: jest.fn(),
    bulkDelete: jest.fn().mockResolvedValue({ statuses: [] }),
  } as unknown as jest.Mocked<ISavedObjectsRepository>);

const findResult = (ids: string[]) => ({
  saved_objects: ids.map((id) => ({
    id,
    type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  })),
  total: ids.length,
  page: 1,
  per_page: 500,
});

describe('flushTaskProvisioningStatus', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('fetches and bulk-deletes all task status docs in a single pass', async () => {
    const soClient = createSoClientMock();
    soClient.find.mockResolvedValue(findResult(['a', 'b']) as never);

    const deleted = await flushTaskProvisioningStatus(soClient, logger);

    expect(deleted).toBe(2);
    expect(soClient.find).toHaveBeenCalledTimes(1);
    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE })
    );
    expect(soClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(soClient.bulkDelete).toHaveBeenCalledWith(
      [
        { type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE, id: 'a' },
        { type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE, id: 'b' },
      ],
      { refresh: true }
    );
  });

  it('does nothing when there are no status docs', async () => {
    const soClient = createSoClientMock();
    soClient.find.mockResolvedValue(findResult([]) as never);

    const deleted = await flushTaskProvisioningStatus(soClient, logger);

    expect(deleted).toBe(0);
    expect(soClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('warns when more status docs exist than were returned in the single pass', async () => {
    const soClient = createSoClientMock();
    soClient.find.mockResolvedValue({ ...findResult(['a']), total: 5 } as never);

    const deleted = await flushTaskProvisioningStatus(soClient, logger);

    expect(deleted).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Flushed only 1 of 5'),
      expect.any(Object)
    );
  });

  it('throws and logs when the flush fails', async () => {
    const soClient = createSoClientMock();
    soClient.find.mockRejectedValue(new Error('so down'));

    await expect(flushTaskProvisioningStatus(soClient, logger)).rejects.toThrow('so down');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to flush task UIAM provisioning status'),
      expect.any(Object)
    );
  });
});
