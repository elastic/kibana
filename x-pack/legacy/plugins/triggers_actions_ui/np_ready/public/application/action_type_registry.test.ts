/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from './action_type_registry';
import { ValidationResult } from '../types';

const getTestActionType = (id?: string, iconClass?: string, selectedMessage?: string) => {
  return {
    id: id || 'my-action-type',
    iconClass: iconClass || 'test',
    selectMessage: selectedMessage || 'test',
    validateConnector: (): ValidationResult => {
      return { errors: {} };
    },
    validateParams: (): ValidationResult => {
      const validationResult = { errors: {} };
      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: null,
  };
};

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    actionTypeRegistry.register(getTestActionType());
    expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
  });

  test('throws error if action type already registered', () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    actionTypeRegistry.register(getTestActionType('my-test-action-type-1'));
    expect(() =>
      actionTypeRegistry.register(getTestActionType('my-test-action-type-1'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-test-action-type-1\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    actionTypeRegistry.register(getTestActionType('my-action-type-snapshot'));
    const actionType = actionTypeRegistry.get('my-action-type-snapshot');
    expect(actionType).toMatchInlineSnapshot(`
      Object {
        "actionConnectorFields": null,
        "actionParamsFields": null,
        "iconClass": "test",
        "id": "my-action-type-snapshot",
        "selectMessage": "test",
        "validateConnector": [Function],
        "validateParams": [Function],
      }
    `);
  });

  test(`return null when action type doesn't exist`, () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    expect(actionTypeRegistry.get('not-exist-action-type')).toBeNull();
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    actionTypeRegistry.register(getTestActionType());
    const actionTypes = actionTypeRegistry.list();
    expect(actionTypes).toEqual([
      {
        id: 'my-action-type',
        name: 'my-action-type',
        iconClass: 'test',
        actionType: {
          id: 'my-action-type',
          iconClass: 'test',
          selectMessage: 'test',
          actionConnectorFields: null,
          actionParamsFields: null,
          validateConnector: actionTypes[0].actionType.validateConnector,
          validateParams: actionTypes[0].actionType.validateParams,
        },
      },
    ]);
  });
});

describe('has()', () => {
  test('returns false for unregistered action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    expect(actionTypeRegistry.has('my-action-type')).toEqual(false);
  });

  test('returns true after registering an action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry();
    actionTypeRegistry.register(getTestActionType());
    expect(actionTypeRegistry.has('my-action-type'));
  });
});
