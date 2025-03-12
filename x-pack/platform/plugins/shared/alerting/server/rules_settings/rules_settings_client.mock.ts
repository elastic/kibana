/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RulesSettingsClientApi,
  RulesSettingsFlappingClientApi,
  RulesSettingsQueryDelayClientApi,
  RulesSettingsFlappingProperties,
  DEFAULT_ALERT_DELETION_SETTINGS,
  RulesSettingsAlertDeletionClientApi,
} from '../types';
import { DEFAULT_FLAPPING_SETTINGS, DEFAULT_QUERY_DELAY_SETTINGS } from '../types';

export type RulesSettingsClientMock = jest.Mocked<RulesSettingsClientApi>;
export type RulesSettingsFlappingClientMock = jest.Mocked<RulesSettingsFlappingClientApi>;
export type RulesSettingsQueryDelayClientMock = jest.Mocked<RulesSettingsQueryDelayClientApi>;
export type RulesSettingsAlertDeletionClientMock = jest.Mocked<RulesSettingsAlertDeletionClientApi>;

// Warning: Becareful when resetting all mocks in tests as it would clear
// the mock return value on the flapping
const createRulesSettingsClientMock = (flappingOverride?: RulesSettingsFlappingProperties) => {
  const flappingMocked: RulesSettingsFlappingClientMock = {
    get: jest.fn().mockReturnValue(flappingOverride || DEFAULT_FLAPPING_SETTINGS),
    update: jest.fn(),
  };
  const queryDelayMocked: RulesSettingsQueryDelayClientMock = {
    get: jest.fn().mockReturnValue(DEFAULT_QUERY_DELAY_SETTINGS),
    update: jest.fn(),
  };
  const alertDeletionMocked: RulesSettingsAlertDeletionClientMock = {
    get: jest.fn().mockReturnValue(DEFAULT_ALERT_DELETION_SETTINGS),
    update: jest.fn(),
  };
  const mocked: RulesSettingsClientMock = {
    flapping: jest.fn().mockReturnValue(flappingMocked),
    queryDelay: jest.fn().mockReturnValue(queryDelayMocked),
    alertDeletion: jest.fn().mockReturnValue(alertDeletionMocked),
  };
  return mocked;
};

export const rulesSettingsClientMock: {
  create: (flappingOverride?: RulesSettingsFlappingProperties) => RulesSettingsClientMock;
} = {
  create: (flappingOverride?: RulesSettingsFlappingProperties) =>
    createRulesSettingsClientMock(flappingOverride),
};
