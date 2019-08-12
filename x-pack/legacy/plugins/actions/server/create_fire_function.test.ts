/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerMock } from '../../task_manager/task_manager.mock';
import { createFireFunction } from './create_fire_function';
import { SavedObjectsClientMock } from '../../../../../src/core/server/mocks';

const mockTaskManager = taskManagerMock.create();
const savedObjectsClient = SavedObjectsClientMock.create();
const getBasePath = jest.fn();

beforeEach(() => jest.resetAllMocks());

describe('fire()', () => {
  test('schedules the action with all given parameters', async () => {
    const fireFn = createFireFunction({
      getBasePath,
      taskManager: mockTaskManager,
      getScopedSavedObjectsClient: () => savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '234',
      type: 'fired_action',
      attributes: {},
      references: [],
    });
    await fireFn({
      id: '123',
      params: { baz: false },
      spaceId: 'default',
      apiKeyId: '123',
      generatedApiKey: 'abc',
    });
    expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.schedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "params": Object {
            "firedActionId": "234",
            "spaceId": "default",
          },
          "scope": Array [
            "actions",
          ],
          "state": Object {},
          "taskType": "actions:mock-action",
        },
      ]
    `);
    expect(savedObjectsClient.get).toHaveBeenCalledWith('action', '123');
    expect(savedObjectsClient.create).toHaveBeenCalledWith('fired_action', {
      actionId: '123',
      params: { baz: false },
      apiKeyId: '123',
      generatedApiKey: 'abc',
    });
  });
});
