/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '@kbn/uiam-api-keys-provisioning-status';
import { NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE, GET_STATUS_BATCH_SIZE } from '../constants';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../uiam_api_keys_provisioning_status_saved_object';
import { getExcludeTasksFilter } from './get_exclude_tasks_filter';

function createStatusSavedObject(
  entityId: string,
  status: UiamApiKeyProvisioningStatus = UiamApiKeyProvisioningStatus.COMPLETED,
  message?: string,
  errorCode?: string
) {
  return {
    id: entityId,
    type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    attributes: {
      entityId,
      entityType: UiamApiKeyProvisioningEntityType.TASK,
      status,
      ...(message ? { message } : {}),
      ...(errorCode ? { errorCode } : {}),
    },
    references: [],
    score: 1,
    namespaces: ['default'],
  };
}

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
        createStatusSavedObject('t1', UiamApiKeyProvisioningStatus.SKIPPED),
        createStatusSavedObject('t2', UiamApiKeyProvisioningStatus.COMPLETED),
      ],
      total: 2,
      per_page: 500,
      page: 1,
    } as never);

    const result = await getExcludeTasksFilter(client);
    expect(result.sort()).toEqual(['t1', 't2']);
  });

  it('includes failed non-Cloud-user conversion errors in the exclusion query', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find.mockResolvedValue({
      saved_objects: [
        createStatusSavedObject(
          'task-1',
          UiamApiKeyProvisioningStatus.FAILED,
          undefined,
          NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE
        ),
      ],
      total: 1,
      per_page: 500,
      page: 1,
    });

    const result = await getExcludeTasksFilter(client);
    expect(result).toBeDefined();

    const findFilter = client.find.mock.calls[0][0].filter;
    expect(findFilter.function).toBe('and');
    expect(findFilter.arguments[0].function).toBe('or');
    expect(findFilter.arguments[0].arguments).toContainEqual(
      expect.objectContaining({
        function: 'and',
        arguments: expect.arrayContaining([
          expect.objectContaining({
            function: 'is',
            arguments: expect.arrayContaining([
              expect.objectContaining({
                value: `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes.status`,
              }),
              expect.objectContaining({ value: UiamApiKeyProvisioningStatus.FAILED }),
            ]),
          }),
          expect.objectContaining({
            function: 'is',
            arguments: expect.arrayContaining([
              expect.objectContaining({
                value: `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes.errorCode`,
              }),
              expect.objectContaining({ value: NON_CLOUD_USER_API_KEY_CREATOR_ERROR_CODE }),
            ]),
          }),
        ]),
      })
    );
  });

  it('paginates through multiple pages of status docs', async () => {
    const client = savedObjectsRepositoryMock.create();
    client.find
      .mockResolvedValueOnce({
        saved_objects: [createStatusSavedObject('t1')],
        total: 501,
        per_page: GET_STATUS_BATCH_SIZE,
        page: 1,
      } as never)
      .mockResolvedValueOnce({
        saved_objects: [createStatusSavedObject('t2')],
        total: 501,
        per_page: GET_STATUS_BATCH_SIZE,
        page: 2,
      } as never);

    const result = await getExcludeTasksFilter(client);
    expect(result.sort()).toEqual(['t1', 't2']);
  });
});
