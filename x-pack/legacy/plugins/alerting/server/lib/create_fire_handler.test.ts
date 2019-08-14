/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFireHandler } from './create_fire_handler';

const createFireHandlerParams = {
  executeAction: jest.fn(),
  spaceId: 'default',
  spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
  getBasePath: jest.fn().mockReturnValue(undefined),
  alertSavedObject: {
    id: '1',
    type: 'alert',
    attributes: {
      alertTypeId: '123',
      interval: '10s',
      alertTypeParams: {
        bar: true,
      },
      actions: [
        {
          group: 'default',
          actionRef: 'action_0',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
          },
        },
      ],
    },
    references: [
      {
        name: 'action_0',
        type: 'action',
        id: '1',
      },
    ],
  },
};

beforeEach(() => jest.resetAllMocks());

test('calls executeAction per selected action', async () => {
  const fireHandler = createFireHandler(createFireHandlerParams);
  await fireHandler('default', {}, {});
  expect(createFireHandlerParams.executeAction).toHaveBeenCalledTimes(1);
  expect(createFireHandlerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "1",
        "params": Object {
          "contextVal": "My  goes here",
          "foo": true,
          "stateVal": "My  goes here",
        },
        "spaceId": "default",
      },
    ]
  `);
});

test('limits executeAction per action group', async () => {
  const fireHandler = createFireHandler(createFireHandlerParams);
  await fireHandler('other-group', {}, {});
  expect(createFireHandlerParams.executeAction).toMatchInlineSnapshot(`[MockFunction]`);
});

test('context attribute gets parameterized', async () => {
  const fireHandler = createFireHandler(createFireHandlerParams);
  await fireHandler('default', { value: 'context-val' }, {});
  expect(createFireHandlerParams.executeAction).toHaveBeenCalledTimes(1);
  expect(createFireHandlerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "1",
        "params": Object {
          "contextVal": "My context-val goes here",
          "foo": true,
          "stateVal": "My  goes here",
        },
        "spaceId": "default",
      },
    ]
  `);
});

test('state attribute gets parameterized', async () => {
  const fireHandler = createFireHandler(createFireHandlerParams);
  await fireHandler('default', {}, { value: 'state-val' });
  expect(createFireHandlerParams.executeAction).toHaveBeenCalledTimes(1);
  expect(createFireHandlerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "id": "1",
        "params": Object {
          "contextVal": "My  goes here",
          "foo": true,
          "stateVal": "My state-val goes here",
        },
        "spaceId": "default",
      },
    ]
  `);
});

test('throws error if reference not found', async () => {
  const params = {
    spaceId: 'default',
    executeAction: jest.fn(),
    alertSavedObject: {
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        interval: '10s',
        alertTypeParams: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
              contextVal: 'My {{context.value}} goes here',
              stateVal: 'My {{state.value}} goes here',
            },
          },
        ],
      },
      references: [],
    },
  };
  const fireHandler = createFireHandler(params);
  await expect(
    fireHandler('default', {}, { value: 'state-val' })
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Action reference \\"action_0\\" not found in alert id: 1"`
  );
});
