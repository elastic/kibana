/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
import { getTasksTelemetryData } from './tasks';

describe('getTasksTelemetryData', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsClient = savedObjectsRepositoryMock.create();
  const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsClient);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('reads counts from the aggregations and the task list total', async () => {
    savedObjectsClient.find
      .mockResolvedValueOnce({
        total: 7,
        saved_objects: [],
        per_page: 0,
        page: 0,
        aggregations: {
          byStatus: {
            buckets: [
              { key: 'open', doc_count: 3 },
              { key: 'in_progress', doc_count: 1 },
              { key: 'completed', doc_count: 3 },
            ],
          },
          casesWithTasks: { value: 2 },
          fromTaskList: { doc_count: 4 },
        },
      } as never)
      .mockResolvedValueOnce({ total: 5, saved_objects: [], per_page: 0, page: 0 });

    await expect(
      getTasksTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger })
    ).resolves.toEqual({
      total: 7,
      byStatus: { open: 3, inProgress: 1, completed: 3, cancelled: 0 },
      casesWithTasks: 2,
      fromTaskList: 4,
      taskLists: 5,
    });

    expect(savedObjectsClient.find.mock.calls[0][0]).toMatchObject({
      type: 'cases-tasks',
      namespaces: ['*'],
      perPage: 0,
    });
  });

  it('logs and rethrows when the search fails', async () => {
    // Failure scenario: the saved objects search rejects.
    savedObjectsClient.find.mockRejectedValue(new Error('boom'));

    await expect(
      getTasksTelemetryData({ savedObjectsClient: telemetrySavedObjectsClient, logger })
    ).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(
      'Cases tasks telemetry failed with error: Error: boom'
    );
  });
});
