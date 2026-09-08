/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import {
  createFailedConversionTaskProvisioningStatus,
  createSkippedTaskProvisioningStatus,
  writeTaskUiamProvisioningObservabilityStatus,
} from './task_uiam_provisioning_observability_status';

describe('task_uiam_provisioning_observability_status', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns per-item when bulkCreate returns saved objects with errors', async () => {
    const savedObjectsClient = {
      bulkCreate: jest.fn().mockResolvedValue({
        saved_objects: [
          { id: 'task-ok' },
          { id: 'task-failed', error: { message: 'validation failed' } },
        ],
      }),
    } as unknown as ISavedObjectsRepository;

    await writeTaskUiamProvisioningObservabilityStatus(savedObjectsClient, logger, {
      skipped: [createSkippedTaskProvisioningStatus('task-ok', 'no api key')],
      failedConversions: [],
      completed: [],
      failed: [createFailedConversionTaskProvisioningStatus('task-failed', 'failed')],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'Error writing task provisioning status for task-failed: validation failed',
      expect.objectContaining({ tags: expect.any(Array) })
    );
    expect(logger.info).toHaveBeenCalled();
  });

  it('tags whole-call bulkCreate failures with status-write-failed and swallows', async () => {
    const savedObjectsClient = {
      bulkCreate: jest.fn().mockRejectedValue(new Error('bulkCreate failed')),
    } as unknown as ISavedObjectsRepository;

    await expect(
      writeTaskUiamProvisioningObservabilityStatus(savedObjectsClient, logger, {
        skipped: [createSkippedTaskProvisioningStatus('task-1', 'no api key')],
        failedConversions: [],
        completed: [],
        failed: [],
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Error writing provisioning status: bulkCreate failed',
      expect.objectContaining({
        error: expect.objectContaining({
          tags: expect.arrayContaining(['status-write-failed']),
        }),
      })
    );
  });
});
