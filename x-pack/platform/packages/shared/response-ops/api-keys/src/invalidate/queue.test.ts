/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { queueInvalidationTargets } from './queue';

const type = 'api_key_pending_invalidation';

describe('queueInvalidationTargets', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does nothing without targets', async () => {
    await expect(
      queueInvalidationTargets([], { type, savedObjectsClient, logger })
    ).resolves.toEqual([]);
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('writes one pending invalidation per target and reports each result', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [
        { id: '1', type, attributes: {}, references: [] },
        {
          id: '2',
          type,
          error: { statusCode: 409, error: 'Conflict', message: 'conflict' },
          attributes: {},
          references: [],
        },
      ],
    });

    const results = await queueInvalidationTargets(
      [
        { apiKeyId: 'es-id', taskId: 'task-1', taskStartedAt: '2026-01-01T00:00:00.000Z' },
        { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' },
      ],
      { type, savedObjectsClient, logger }
    );

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith([
      {
        type,
        attributes: {
          apiKeyId: 'es-id',
          createdAt: expect.any(String),
          taskId: 'task-1',
          taskStartedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      {
        type,
        attributes: {
          apiKeyId: 'uiam-id',
          createdAt: expect.any(String),
          uiamApiKey: 'essu_secret',
        },
      },
    ]);
    expect(results).toEqual([{ success: true }, { success: false, message: 'conflict' }]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to mark API key "uiam-id" for invalidation: conflict'
    );
  });

  it('logs and returns failures instead of throwing', async () => {
    savedObjectsClient.bulkCreate.mockRejectedValue(new Error('boom'));

    await expect(
      queueInvalidationTargets([{ apiKeyId: 'es-id' }], { type, savedObjectsClient, logger })
    ).resolves.toEqual([{ success: false, message: 'boom' }]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to bulk mark list of API keys ["es-id"] for invalidation: boom',
      expect.anything()
    );
  });
});
