/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { queueApiKeysForInvalidation } from './queue_api_keys_for_invalidation';

const setup = () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();
  return {
    savedObjectsClient,
    logger,
    deps: { savedObjectsClient, logger, type: 'api_key_pending_invalidation' },
  };
};

describe('queueApiKeysForInvalidation', () => {
  test('writes one pending-invalidation document per entry', async () => {
    const { savedObjectsClient, logger, deps } = setup();
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [
        { id: '1', type: 't', attributes: {}, references: [] },
        {
          id: '2',
          type: 't',
          attributes: {},
          references: [],
          error: { error: 'Conflict', message: 'conflict', statusCode: 409 },
        },
      ],
    });

    const written = await queueApiKeysForInvalidation(deps, [
      { apiKeyId: 'es-id', attributes: { taskId: 'task-1', taskStartedAt: 'now' } },
      { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' },
    ]);

    expect(written).toEqual([{ success: true }, { success: false, message: 'conflict' }]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to mark API key "uiam-id" for invalidation: conflict'
    );
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith([
      {
        type: 'api_key_pending_invalidation',
        attributes: {
          apiKeyId: 'es-id',
          createdAt: expect.any(String),
          taskId: 'task-1',
          taskStartedAt: 'now',
        },
      },
      {
        type: 'api_key_pending_invalidation',
        attributes: {
          apiKeyId: 'uiam-id',
          createdAt: expect.any(String),
          uiamApiKey: 'essu_secret',
        },
      },
    ]);
  });

  test('logs and reports nothing written when the write throws', async () => {
    const { savedObjectsClient, logger, deps } = setup();
    savedObjectsClient.bulkCreate.mockRejectedValue(new Error('boom'));

    expect(await queueApiKeysForInvalidation(deps, [{ apiKeyId: 'es-id' }])).toEqual([
      { success: false, message: 'boom' },
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to bulk mark list of API keys ["es-id"] for invalidation: boom',
      expect.any(Object)
    );
  });

  test('skips the write for an empty list', async () => {
    const { savedObjectsClient, deps } = setup();

    expect(await queueApiKeysForInvalidation(deps, [])).toEqual([]);
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });
});
