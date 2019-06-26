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

beforeEach(() => jest.resetAllMocks());

describe('fire()', () => {
  test('schedules the action with all given parameters', async () => {
    const fireFn = createFireFunction({
      taskManager: mockTaskManager,
      internalSavedObjectsRepository: savedObjectsClient,
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    await fireFn({
      id: '123',
      params: { baz: false },
      namespace: 'abc',
      basePath: '/s/default',
    });
    expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.schedule.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "params": Object {
      "actionTypeParams": Object {
        "baz": false,
      },
      "basePath": "/s/default",
      "id": "123",
      "namespace": "abc",
    },
    "scope": Array [
      "actions",
    ],
    "state": Object {},
    "taskType": "actions:mock-action",
  },
]
`);
    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "123",
  Object {
    "namespace": "abc",
  },
]
`);
  });
});
