/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../types';
import { validateParams } from '../lib';
import { Logger } from '../../../../../../src/core/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { createActionTypeRegistry } from './index.test';

const ACTION_TYPE_ID = '.server-log';

let actionType: ActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
  mockedLogger = logger;
  expect(actionType).toBeTruthy();
});

describe('get()', () => {
  test('returns action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Server Log');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(validateParams(actionType, { message: 'a message', level: 'info' })).toEqual({
      message: 'a message',
      level: 'info',
    });
    expect(
      validateParams(actionType, {
        message: 'a message',
        level: 'info',
      })
    ).toEqual({
      message: 'a message',
      level: 'info',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(actionType, { message: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateParams(actionType, { message: 'x', level: 2 });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [level]: types that failed validation:
- [level.0]: expected value to equal [trace] but got [2]
- [level.1]: expected value to equal [debug] but got [2]
- [level.2]: expected value to equal [info] but got [2]
- [level.3]: expected value to equal [warn] but got [2]
- [level.4]: expected value to equal [error] but got [2]
- [level.5]: expected value to equal [fatal] but got [2]"
`);

    expect(() => {
      validateParams(actionType, { message: 'x', level: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [level]: types that failed validation:
- [level.0]: expected value to equal [trace] but got [foo]
- [level.1]: expected value to equal [debug] but got [foo]
- [level.2]: expected value to equal [info] but got [foo]
- [level.3]: expected value to equal [warn] but got [foo]
- [level.4]: expected value to equal [error] but got [foo]
- [level.5]: expected value to equal [fatal] but got [foo]"
`);
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const actionId = 'some-id';
    await actionType.executor({
      actionId,
      services: {
        callCluster: async (path: string, opts: any) => {},
        savedObjectsClient: savedObjectsClientMock.create(),
      },
      params: { message: 'message text here', level: 'info' },
      config: {},
      secrets: {},
    });
    expect(mockedLogger.info).toHaveBeenCalledWith('Server Log: message text here');
  });
});
