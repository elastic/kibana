/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getExcludeTasksFilter } from './get_exclude_tasks_filter';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';

describe('getExcludeTasksFilter', () => {
  it('returns empty when there are no status docs', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 500,
      page: 1,
    });

    const result = await getExcludeTasksFilter(client);
    expect(result).toEqual([]);
  });

  it('collects entityId from skipped and completed task rows', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
          attributes: { entityId: 't1', entityType: 'task', status: 'skipped' },
          references: [],
          score: 0,
          namespaces: ['default'],
        },
        {
          id: '2',
          type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
          attributes: { entityId: 't2', entityType: 'task', status: 'completed' },
          references: [],
          score: 0,
          namespaces: ['default'],
        },
      ],
      total: 2,
      per_page: 500,
      page: 1,
    } as never);

    const result = await getExcludeTasksFilter(client);
    expect(result.sort()).toEqual(['t1', 't2']);
  });
});
