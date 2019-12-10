/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { connectorReducer } from './connector_reducer';

describe('connector reducer', () => {
  test('if property name was changed', () => {
    const connector = {
      secrets: {},
      id: 'test',
      actionTypeId: 'test-action-type-id',
      actionType: 'test-action-type-name',
      name: 'action-connector',
      referencedByCount: 0,
      config: {},
    };

    const updatedConnector = connectorReducer(
      { connector },
      {
        command: 'setProperty',
        payload: {
          key: 'name',
          value: 'new name',
        },
      }
    );
    expect(updatedConnector.connector.name).toBe('new name');
  });

  test('if property config property was added', () => {
    const connector = {
      secrets: {},
      id: 'test',
      actionTypeId: 'test-action-type-id',
      actionType: 'test-action-type-name',
      name: 'action-connector',
      referencedByCount: 0,
      config: {},
    };

    const updatedConnector = connectorReducer(
      { connector },
      {
        command: 'setConfigProperty',
        payload: {
          key: 'test',
          value: 'new test property',
        },
      }
    );
    expect(updatedConnector.connector.test).toBe('new test property');
  });
});
