/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeRegistry } from './type_registry';
import { ValidationResult, AlertTypeModel, ActionTypeModel } from '../types';

export const ExpressionComponent: React.FunctionComponent = () => {
  return null;
};

const getTestAlertType = (id?: string, name?: string, iconClass?: string) => {
  return {
    id: id || 'test-alet-type',
    name: name || 'Test alert type',
    iconClass: iconClass || 'icon',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: ExpressionComponent,
  };
};

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
  test('able to register alert types', () => {
    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    alertTypeRegistry.register(getTestAlertType());
    expect(alertTypeRegistry.has('test-alet-type')).toEqual(true);
  });

  test('throws error if alert type already registered', () => {
    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    alertTypeRegistry.register(getTestAlertType('my-test-alert-type-1'));
    expect(() =>
      alertTypeRegistry.register(getTestAlertType('my-test-alert-type-1'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Object type \\"my-test-alert-type-1\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
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
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    expect(actionTypeRegistry.get('not-exist-action-type')).toBeNull();
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
    actionTypeRegistry.register(getTestActionType());
    const actionTypes = actionTypeRegistry.list();
    expect(actionTypes).toEqual([
      {
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        actionConnectorFields: null,
        actionParamsFields: null,
        validateConnector: actionTypes[0].validateConnector,
        validateParams: actionTypes[0].validateParams,
      },
    ]);
  });
});

describe('has()', () => {
  test('returns false for unregistered alert types', () => {
    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    expect(alertTypeRegistry.has('my-alert-type')).toEqual(false);
  });

  test('returns true after registering an alert type', () => {
    const alertTypeRegistry = new TypeRegistry<AlertTypeModel>();
    alertTypeRegistry.register(getTestAlertType());
    expect(alertTypeRegistry.has('test-alet-type'));
  });
});
