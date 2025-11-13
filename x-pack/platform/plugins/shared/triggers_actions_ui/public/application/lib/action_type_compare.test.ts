/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockConnectorType } from '@kbn/actions-plugin/server/application/connector/mocks';
import type { ActionType } from '../../types';
import { actionTypeCompare } from './action_type_compare';

test('should sort enabled action types first', async () => {
  const actionTypes: ActionType[] = [
    createMockConnectorType({
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'first',
    }),
    createMockConnectorType({
      id: '2',
      minimumLicenseRequired: 'gold',
      supportedFeatureIds: ['alerting'],
      name: 'second',
      enabled: false,
      enabledInConfig: true,
    }),
    createMockConnectorType({
      id: '3',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'third',
      enabledInConfig: true,
      enabledInLicense: true,
    }),
    createMockConnectorType({
      id: '4',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'x-fourth',
      enabledInConfig: false,
      enabledInLicense: true,
    }),
  ];
  const result = [...actionTypes].sort(actionTypeCompare);
  expect(result[0]).toEqual(actionTypes[0]);
  expect(result[1]).toEqual(actionTypes[2]);
  expect(result[2]).toEqual(actionTypes[3]);
  expect(result[3]).toEqual(actionTypes[1]);
});

test('should sort by name when all enabled', async () => {
  const actionTypes: ActionType[] = [
    createMockConnectorType({
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'third',
    }),
    createMockConnectorType({
      id: '2',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'first',
    }),
    createMockConnectorType({
      id: '3',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'second',
    }),
    createMockConnectorType({
      id: '4',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'x-fourth',
      enabledInConfig: false,
    }),
  ];
  const result = [...actionTypes].sort(actionTypeCompare);
  expect(result[0]).toEqual(actionTypes[1]);
  expect(result[1]).toEqual(actionTypes[2]);
  expect(result[2]).toEqual(actionTypes[0]);
  expect(result[3]).toEqual(actionTypes[3]);
});
