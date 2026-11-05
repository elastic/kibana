/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { queueInvalidationTargets } from './queue';

const NOW = '2026-01-01T00:00:00.000Z';
const TYPE = 'api_key_pending_invalidation';

describe('queueInvalidationTargets', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsClient = savedObjectsClientMock.create();
  const queue = (targets: Parameters<typeof queueInvalidationTargets>[0]) =>
    queueInvalidationTargets(targets, { type: TYPE, savedObjectsClient, logger });

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(NOW));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does nothing for an empty list', async () => {
    await expect(queue([])).resolves.toEqual([]);
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('writes one pending-invalidation object per target', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [0, 1, 2].map((index) => ({
        id: `${index}`,
        type: TYPE,
        attributes: {},
        references: [],
      })),
    });

    await expect(
      queue([
        { apiKeyId: 'es-id' },
        { apiKeyId: 'uiam-id', uiamApiKey: 'essu_secret' },
        { apiKeyId: 'task-key', taskId: 'task-1', taskStartedAt: NOW },
      ])
    ).resolves.toEqual([{ success: true }, { success: true }, { success: true }]);

    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith([
      { type: TYPE, attributes: { apiKeyId: 'es-id', createdAt: NOW } },
      {
        type: TYPE,
        attributes: { apiKeyId: 'uiam-id', createdAt: NOW, uiamApiKey: 'essu_secret' },
      },
      {
        type: TYPE,
        attributes: { apiKeyId: 'task-key', createdAt: NOW, taskId: 'task-1', taskStartedAt: NOW },
      },
    ]);
  });

  test('reports every target as failed and logs once when bulkCreate throws', async () => {
    const failure = new Error('index read-only');
    savedObjectsClient.bulkCreate.mockRejectedValueOnce(failure);

    await expect(queue([{ apiKeyId: 'id-a' }, { apiKeyId: 'id-b' }])).resolves.toEqual([
      { success: false, message: 'index read-only' },
      { success: false, message: 'index read-only' },
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to bulk mark list of API keys ["id-a", "id-b"] for invalidation: index read-only',
      { error: { stack_trace: failure.stack } }
    );
  });

  test('reports per-object errors and missing entries', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        { id: '0', type: TYPE, attributes: {}, references: [] },
        {
          id: '1',
          type: TYPE,
          attributes: {},
          references: [],
          error: { statusCode: 409, error: 'Conflict', message: 'version conflict' },
        },
      ],
    });

    await expect(
      queue([{ apiKeyId: 'ok' }, { apiKeyId: 'bad' }, { apiKeyId: 'missing' }])
    ).resolves.toEqual([
      { success: true },
      { success: false, message: 'version conflict' },
      { success: false, message: 'Saved object was not returned by bulkCreate' },
    ]);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });
});
