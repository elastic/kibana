/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionTypeRegistry } from '../../action_type_registry';
import { registerBuiltInActionTypes } from './index';
import { ActionTypeModel, ActionConnector } from '../../../types';
const ACTION_TYPE_ID = '.email';
let actionTypeModel: ActionTypeModel | undefined;

beforeAll(() => {
  const actionTypeRegistry = new ActionTypeRegistry();
  registerBuiltInActionTypes({ actionTypeRegistry });
  actionTypeModel = actionTypeRegistry.get(ACTION_TYPE_ID);
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('email');
  });
});

describe('connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
        port: '2323',
        host: 'localhost',
        test: 'test',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });

    delete actionConnector.config.test;
    actionConnector.config.host = 'elastic.co';
    actionConnector.config.port = 8080;
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: [],
        host: [],
        user: [],
        password: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.email',
      name: 'email',
      config: {
        from: 'test@test.com',
      },
    } as ActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        from: [],
        port: ['Port is required.'],
        host: ['Host is required.'],
        user: [],
        password: [],
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      to: 'test@test.com',
      cc: 'test1@test.com',
      message: 'message {test}',
      subject: 'test',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when action params is not valid', () => {
    const actionParams = {
      to: 'test@test.com',
      subject: 'test',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        message: ['Message is required.'],
        subject: [],
      },
    });
  });
});
