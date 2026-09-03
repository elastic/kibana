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
  createTaskProvisioningStatusFromBulkUpdateResult,
  deleteLegacyTaskProvisioningStatusDocs,
  writeTaskUiamProvisioningObservabilityStatus,
} from './task_uiam_provisioning_observability_status';

const UIAM_PROVISIONING_STATUS_TYPE = 'uiam_api_keys_provisioning_status';

const createSavedObjectsClientMock = (
  overrides: Partial<Record<'bulkCreate' | 'bulkDelete', jest.Mock>> = {}
) =>
  ({
    bulkCreate: jest.fn().mockResolvedValue({ saved_objects: [] }),
    bulkDelete: jest.fn().mockResolvedValue({ statuses: [] }),
    ...overrides,
  } as unknown as ISavedObjectsRepository);

describe('task_uiam_provisioning_observability_status', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('status doc ids', () => {
    it('namespaces the doc id by entity type so a task never collides with the rule sharing its uuid', () => {
      const sharedUuid = '1f7c9a4e-0000-4000-8000-000000000000';

      expect(createSkippedTaskProvisioningStatus(sharedUuid, 'no api key')).toEqual(
        expect.objectContaining({
          id: `task:${sharedUuid}`,
          attributes: expect.objectContaining({ entityId: sharedUuid, entityType: 'task' }),
        })
      );
      expect(createFailedConversionTaskProvisioningStatus(sharedUuid, 'failed', 'code')).toEqual(
        expect.objectContaining({
          id: `task:${sharedUuid}`,
          attributes: expect.objectContaining({ entityId: sharedUuid, entityType: 'task' }),
        })
      );
      expect(createTaskProvisioningStatusFromBulkUpdateResult({ id: sharedUuid })).toEqual(
        expect.objectContaining({
          id: `task:${sharedUuid}`,
          attributes: expect.objectContaining({ entityId: sharedUuid, entityType: 'task' }),
        })
      );
    });
  });

  it('warns per-item when bulkCreate returns saved objects with errors', async () => {
    const savedObjectsClient = createSavedObjectsClientMock({
      bulkCreate: jest.fn().mockResolvedValue({
        saved_objects: [
          { id: 'task:task-ok' },
          { id: 'task:task-failed', error: { message: 'validation failed' } },
        ],
      }),
    });

    await writeTaskUiamProvisioningObservabilityStatus(savedObjectsClient, logger, {
      skipped: [createSkippedTaskProvisioningStatus('task-ok', 'no api key')],
      failedConversions: [],
      completed: [],
      failed: [createFailedConversionTaskProvisioningStatus('task-failed', 'failed')],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'Error writing task provisioning status for task:task-failed: validation failed',
      expect.objectContaining({ tags: expect.any(Array) })
    );
    expect(logger.info).toHaveBeenCalled();
  });

  it('writes namespaced ids and then deletes the legacy bare-id docs', async () => {
    const savedObjectsClient = createSavedObjectsClientMock();

    await writeTaskUiamProvisioningObservabilityStatus(savedObjectsClient, logger, {
      skipped: [createSkippedTaskProvisioningStatus('task-1', 'no api key')],
      failedConversions: [],
      completed: [createTaskProvisioningStatusFromBulkUpdateResult({ id: 'task-2' })],
      failed: [],
    });

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id: 'task:task-1' }),
        expect.objectContaining({ id: 'task:task-2' }),
      ],
      { overwrite: true }
    );
    expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      { type: UIAM_PROVISIONING_STATUS_TYPE, id: 'task-1' },
      { type: UIAM_PROVISIONING_STATUS_TYPE, id: 'task-2' },
    ]);
  });

  it('tags whole-call bulkCreate failures with status-write-failed and swallows', async () => {
    const savedObjectsClient = createSavedObjectsClientMock({
      bulkCreate: jest.fn().mockRejectedValue(new Error('bulkCreate failed')),
    });

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
    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  describe('deleteLegacyTaskProvisioningStatusDocs', () => {
    it('deletes each bare entity id once', async () => {
      const savedObjectsClient = createSavedObjectsClientMock();

      await deleteLegacyTaskProvisioningStatusDocs(savedObjectsClient, logger, [
        createSkippedTaskProvisioningStatus('task-1', 'no api key'),
        createFailedConversionTaskProvisioningStatus('task-1', 'failed'),
        createSkippedTaskProvisioningStatus('task-2', 'no api key'),
      ]);

      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: UIAM_PROVISIONING_STATUS_TYPE, id: 'task-1' },
        { type: UIAM_PROVISIONING_STATUS_TYPE, id: 'task-2' },
      ]);
    });

    it('does not call bulkDelete when there are no docs', async () => {
      const savedObjectsClient = createSavedObjectsClientMock();

      await deleteLegacyTaskProvisioningStatusDocs(savedObjectsClient, logger, []);

      expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('stays quiet for 404s, which are the steady state once no legacy doc is left', async () => {
      const savedObjectsClient = createSavedObjectsClientMock({
        bulkDelete: jest.fn().mockResolvedValue({
          statuses: [
            {
              id: 'task-1',
              type: UIAM_PROVISIONING_STATUS_TYPE,
              success: false,
              error: { statusCode: 404, message: 'Not found' },
            },
          ],
        }),
      });

      await deleteLegacyTaskProvisioningStatusDocs(savedObjectsClient, logger, [
        createSkippedTaskProvisioningStatus('task-1', 'no api key'),
      ]);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('warns on non-404 per-item failures', async () => {
      const savedObjectsClient = createSavedObjectsClientMock({
        bulkDelete: jest.fn().mockResolvedValue({
          statuses: [
            {
              id: 'task-1',
              type: UIAM_PROVISIONING_STATUS_TYPE,
              success: false,
              error: { statusCode: 409, message: 'Conflict' },
            },
          ],
        }),
      });

      await deleteLegacyTaskProvisioningStatusDocs(savedObjectsClient, logger, [
        createSkippedTaskProvisioningStatus('task-1', 'no api key'),
      ]);

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to delete 1 legacy UIAM provisioning status doc(s): Conflict',
        expect.objectContaining({ tags: expect.any(Array) })
      );
    });

    it('swallows a whole-call bulkDelete failure', async () => {
      const savedObjectsClient = createSavedObjectsClientMock({
        bulkDelete: jest.fn().mockRejectedValue(new Error('bulkDelete failed')),
      });

      await expect(
        deleteLegacyTaskProvisioningStatusDocs(savedObjectsClient, logger, [
          createSkippedTaskProvisioningStatus('task-1', 'no api key'),
        ])
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        'Error deleting legacy UIAM provisioning status docs: bulkDelete failed',
        expect.objectContaining({ tags: expect.any(Array) })
      );
    });
  });
});
