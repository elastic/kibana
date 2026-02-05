/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    source: 'stack',
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
