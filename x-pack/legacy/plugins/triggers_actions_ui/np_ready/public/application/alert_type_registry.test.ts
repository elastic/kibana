/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTypeRegistry } from './alert_type_registry';
import { ValidationResult } from '../types';

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

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register alert types', () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    alertTypeRegistry.register(getTestAlertType());
    expect(alertTypeRegistry.has('test-alet-type')).toEqual(true);
  });

  test('throws error if alert type already registered', () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    alertTypeRegistry.register(getTestAlertType('my-test-alert-type-1'));
    expect(() =>
      alertTypeRegistry.register(getTestAlertType('my-test-alert-type-1'))
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert type \\"my-test-alert-type-1\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns alert type', () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    alertTypeRegistry.register(getTestAlertType('my-alert-type-snapshot'));
    const alertType = alertTypeRegistry.get('my-alert-type-snapshot');
    expect(alertType).toMatchInlineSnapshot(`
      Object {
        "alertParamsExpression": [Function],
        "iconClass": "icon",
        "id": "my-alert-type-snapshot",
        "name": "Test alert type",
        "validate": [Function],
      }
    `);
  });

  test(`return null when alert type doesn't exist`, () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    expect(alertTypeRegistry.get('not-exist-alert-type')).toBeNull();
  });
});

describe('list()', () => {
  test('returns list of alert types', () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    alertTypeRegistry.register(getTestAlertType());
    const alertTypes = alertTypeRegistry.list();
    expect(alertTypes).toEqual([
      {
        id: 'test-alet-type',
        name: 'Test alert type',
        iconClass: 'icon',
        alertType: {
          id: 'test-alet-type',
          name: 'Test alert type',
          iconClass: 'icon',
          alertParamsExpression: ExpressionComponent,
          validate: alertTypes[0].alertType.validate,
        },
      },
    ]);
  });
});

describe('has()', () => {
  test('returns false for unregistered alert types', () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    expect(alertTypeRegistry.has('my-alert-type')).toEqual(false);
  });

  test('returns true after registering an alert type', () => {
    const alertTypeRegistry = new AlertTypeRegistry();
    alertTypeRegistry.register(getTestAlertType());
    expect(alertTypeRegistry.has('test-alet-type'));
  });
});
