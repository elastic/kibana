/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createMockConnectorType,
  createMockInMemoryConnector,
} from './application/connector/mocks';
import { createSystemConnectors } from './create_system_actions';

const actionTypes = [
  createMockConnectorType({
    id: 'action-type',
    name: 'My action type',
    supportedFeatureIds: ['alerting'],
  }),
  createMockConnectorType({
    id: 'system-action-type-2',
    name: 'My system action type',
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
  }),
];

describe('createSystemConnectors', () => {
  it('creates the system actions correctly', () => {
    expect(createSystemConnectors(actionTypes)).toEqual([
      createMockInMemoryConnector({
        id: 'system-connector-system-action-type-2',
        actionTypeId: 'system-action-type-2',
        name: 'My system action type',
        isMissingSecrets: false,
        isSystemAction: true,
      }),
    ]);
  });
});
