/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionConnector,
  PreConfiguredActionConnector,
  SystemAction,
  UserConfiguredActionConnector,
} from '@kbn/alerts-ui-shared';
import type { FindActionResult, InMemoryConnector } from '../..';
import type { Connector, ConnectorType } from './types';
import './jest_matchers';

export function createMockConnector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: 'test',
    actionTypeId: '.test-connector-type',
    name: 'Test Connector',
    config: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    ...overrides,
  };
}

export function createMockConnectorFindResult(
  overrides: Partial<FindActionResult> = {}
): FindActionResult {
  return {
    id: 'test',
    actionTypeId: '.test-connector-type',
    name: 'Test Connector',
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    referencedByCount: 0,
    ...overrides,
  };
}

// Overload signatures
export function createMockConnectorForUI(
  overrides: Partial<PreConfiguredActionConnector>
): PreConfiguredActionConnector;
export function createMockConnectorForUI(overrides: Partial<SystemAction>): SystemAction;
export function createMockConnectorForUI<
  Secrets = Record<string, unknown>,
  Config = Record<string, unknown>
>(
  overrides: Partial<UserConfiguredActionConnector<Secrets, Config>>
): UserConfiguredActionConnector<Secrets, Config>;

export function createMockConnectorForUI(
  overrides: Partial<ActionConnector> = {}
):
  | PreConfiguredActionConnector
  | SystemAction
  | UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>> {
  if (overrides.isPreconfigured === true) {
    return {
      id: 'test',
      actionTypeId: '.test-connector-type',
      name: 'Test Connector',
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      ...overrides,
      isSystemAction: false,
      isPreconfigured: true,
    } as PreConfiguredActionConnector;
  }
  if (overrides.isSystemAction === true) {
    return {
      id: 'test',
      actionTypeId: '.test-connector-type',
      name: 'Test Connector',
      isDeprecated: false,
      isConnectorTypeDeprecated: false,
      ...overrides,
      isPreconfigured: false,
      isSystemAction: true,
    } as SystemAction;
  }

  return {
    id: 'test',
    actionTypeId: '.test-connector-type',
    name: 'Test Connector',
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    ...overrides,
  } as UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>;
}

export function createMockConnectorType(overrides: Partial<ConnectorType> = {}): ConnectorType {
  return {
    id: 'test',
    name: 'Test Connector Type',
    enabledInConfig: true,
    enabledInLicense: true,
    enabled: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: [],
    isSystemActionType: false,
    isDeprecated: false,
    ...overrides,
  };
}

export function createMockInMemoryConnector(
  overrides: Partial<InMemoryConnector> = {}
): InMemoryConnector {
  return {
    id: 'test',
    actionTypeId: '.test-connector-type',
    name: 'Test Connector',
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    secrets: {},
    config: {},
    ...overrides,
  };
}
