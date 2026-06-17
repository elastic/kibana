/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { TASK_MANAGER_INDEX } from '../../constants';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import {
  flushTaskProvisioningStatus,
  resetUiamKeysForReprovisioning,
  stripUiamKeysFromProvisionedTasks,
} from './reset_uiam_keys_for_reprovisioning';

const findResult = (ids: string[]) => ({
  saved_objects: ids.map((id) => ({
    id,
    type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  })),
  total: ids.length,
  page: 1,
  per_page: 500,
});

describe('reset_uiam_keys_for_reprovisioning', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  describe('stripUiamKeysFromProvisionedTasks', () => {
    it('removes the UIAM fields from provisioned task docs via update_by_query', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      const updateByQuery = esClient.updateByQuery as unknown as jest.Mock;
      updateByQuery.mockResolvedValue({ updated: 3, version_conflicts: 1 });

      const updated = await stripUiamKeysFromProvisionedTasks(
        esClient as unknown as ElasticsearchClient,
        logger
      );

      expect(updated).toBe(3);
      const arg = updateByQuery.mock.calls[0][0];
      expect(arg.index).toBe(TASK_MANAGER_INDEX);
      expect(arg.conflicts).toBe('proceed');
      expect(arg.refresh).toBe(true);
      expect(arg.query).toEqual({
        bool: { filter: [{ exists: { field: 'task.userScope.uiamApiKeyId' } }] },
      });
      expect(arg.script.lang).toBe('painless');
      expect(arg.script.source).toContain("ctx._source.task.remove('uiamApiKey')");
      expect(arg.script.source).toContain("ctx._source.task.userScope.remove('uiamApiKeyId')");
    });

    it('throws and logs when update_by_query fails', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      (esClient.updateByQuery as unknown as jest.Mock).mockRejectedValue(new Error('es down'));

      await expect(
        stripUiamKeysFromProvisionedTasks(esClient as unknown as ElasticsearchClient, logger)
      ).rejects.toThrow('es down');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to strip UIAM keys'),
        expect.any(Object)
      );
    });
  });

  describe('flushTaskProvisioningStatus', () => {
    it('fetches and bulk-deletes all task status docs in a single pass', async () => {
      const soClient = savedObjectsRepositoryMock.create();
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
      const soClient = savedObjectsRepositoryMock.create();
      soClient.find.mockResolvedValue(findResult([]) as never);

      const deleted = await flushTaskProvisioningStatus(soClient, logger);

      expect(deleted).toBe(0);
      expect(soClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('warns when more status docs exist than were returned in the single pass', async () => {
      const soClient = savedObjectsRepositoryMock.create();
      soClient.find.mockResolvedValue({ ...findResult(['a']), total: 5 } as never);

      const deleted = await flushTaskProvisioningStatus(soClient, logger);

      expect(deleted).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Flushed only 1 of 5'),
        expect.any(Object)
      );
    });
  });

  describe('resetUiamKeysForReprovisioning', () => {
    it('strips keys and flushes status, returning both counts', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      (esClient.updateByQuery as unknown as jest.Mock).mockResolvedValue({ updated: 5 });
      const soClient = savedObjectsRepositoryMock.create();
      soClient.find.mockResolvedValue(findResult(['x']) as never);

      const result = await resetUiamKeysForReprovisioning(
        esClient as unknown as ElasticsearchClient,
        soClient,
        logger
      );

      expect(result).toEqual({ tasksStripped: 5, statusDocsFlushed: 1 });
    });
  });
});
