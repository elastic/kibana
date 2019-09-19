/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createExecutionHandler } from './create_execution_handler';

const createExecutionHandlerParams = {
  executeAction: jest.fn(),
  spaceId: 'default',
  alertId: '1',
  apiKey: 'MTIzOmFiYw==',
  spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
  getBasePath: jest.fn().mockReturnValue(undefined),
  actions: [
    {
      id: '1',
      group: 'default',
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
      },
    },
  ],
};

beforeEach(() => jest.resetAllMocks());

test('calls executeAction per selected action', async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'default',
    state: {},
    context: {},
    alertInstanceId: '2',
  });
  expect(createExecutionHandlerParams.executeAction).toHaveBeenCalledTimes(1);
  expect(createExecutionHandlerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
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
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'other-group',
    state: {},
    context: {},
    alertInstanceId: '2',
  });
  expect(createExecutionHandlerParams.executeAction).toMatchInlineSnapshot(`[MockFunction]`);
});

test('context attribute gets parameterized', async () => {
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'default',
    context: { value: 'context-val' },
    state: {},
    alertInstanceId: '2',
  });
  expect(createExecutionHandlerParams.executeAction).toHaveBeenCalledTimes(1);
  expect(createExecutionHandlerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
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
  const executionHandler = createExecutionHandler(createExecutionHandlerParams);
  await executionHandler({
    actionGroup: 'default',
    context: {},
    state: { value: 'state-val' },
    alertInstanceId: '2',
  });
  expect(createExecutionHandlerParams.executeAction).toHaveBeenCalledTimes(1);
  expect(createExecutionHandlerParams.executeAction.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "apiKey": "MTIzOmFiYw==",
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
