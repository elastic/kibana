/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingV2PublicStart } from './types';

const createStartContract = (): AlertingV2PublicStart => ({
  CreateRuleOptionsFlyout: jest.fn(() => null),
  RulesPage: jest.fn(() => null),
  RuleLibraryPage: jest.fn(() => null),
  EpisodesPage: jest.fn(() => null),
  AlertsProvider: jest.fn(({ children }) => children),
  ActionPoliciesPage: jest.fn(() => null),
  ExecutionHistoryPage: jest.fn(() => null),
  createAlertingV2HostApp: jest.fn(),
  createDiscoverProfile: jest.fn(() => ({
    profileId: 'alerting-v2-data-source-profile',
    profile: {},
    resolve: jest.fn().mockResolvedValue({ isMatch: false }),
  })),
});

/** Mocks of the Alerting v2 public contracts, for consumers' tests. */
export const alertingV2PluginMock = {
  createStartContract,
};
