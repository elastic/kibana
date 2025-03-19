/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSystemConnectors } from './create_system_actions';

const actionTypes = [
  {
    id: 'action-type',
    name: 'My action type',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic' as const,
    supportedFeatureIds: ['alerting'],
    isSystemActionType: false,
  },
  {
    id: 'system-action-type-2',
    name: 'My system action type',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic' as const,
    supportedFeatureIds: ['alerting'],
    isSystemActionType: true,
  },
];

describe('createSystemConnectors', () => {
  it('creates the system actions correctly', () => {
    expect(createSystemConnectors(actionTypes)).toEqual([
      {
        id: 'system-connector-system-action-type-2',
        actionTypeId: 'system-action-type-2',
        name: 'My system action type',
        secrets: {},
        config: {},
        isDeprecated: false,
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: true,
      },
    ]);
  });
});
