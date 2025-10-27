/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MatcherFunction } from 'expect';
import type { Connector, ConnectorWithExtraFindData } from './types';
import type { InMemoryConnector } from '../..';

type Connectors = Connector | InMemoryConnector;

export const toContainConnector: MatcherFunction<[expected: Connector]> = function (
  this: jest.MatcherContext,
  actual,
  expected
) {
  const expectedConnector: Connector = {
    id: 'test',
    actionTypeId: '.test-connector-type',
    name: 'Test Connector',
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    ...(expected as Partial<Connector>),
  };

  const pass = this.equals(actual, expectedConnector);

  if (pass) {
    return {
      message: () => `actual connector matches the expected connector`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected connector does not match:\n\n${this.utils.printDiffOrStringify(
          expectedConnector,
          actual,
          'Expected',
          'Received',
          true
        )}`,
      pass: false,
    };
  }
};

export const toContainConnectors: MatcherFunction<
  [expected: Partial<Connectors>[], actual: Connectors[]]
> = function (this: jest.MatcherContext, actual, expected) {
  const actualConnectors = actual as Connectors[];
  const expectedConnectors = expected as Partial<Connectors>[];

  if (actualConnectors.length !== expectedConnectors.length) {
    return {
      message: () =>
        `Expected ${expectedConnectors.length} connectors, but got ${actualConnectors.length}`,
      pass: false,
    };
  }

  for (let i = 0; i < actualConnectors.length; i++) {
    const expectedConnector = expectedConnectors[i];
    const actualConnector = actualConnectors[i];
    const expectedConnectorWithDefaultData: Connectors = {
      id: 'test',
      actionTypeId: '.test-connector-type',
      name: 'Test Connector',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
      ...expectedConnector,
    };

    const pass = this.equals(actualConnector, expectedConnectorWithDefaultData);

    if (!pass) {
      return {
        message: () =>
          `expected connector [index:${i}] does not match:\n\n${this.utils.printDiffOrStringify(
            expectedConnectorWithDefaultData,
            actualConnector,
            'Expected',
            'Received',
            true
          )}`,
        pass: false,
      };
    }
  }

  return {
    message: () => `All the connectors match the expected connectors`,
    pass: true,
  };
};

export const toContainConnectorsFindResult: MatcherFunction<
  [expected: Partial<ConnectorWithExtraFindData>[], actual: ConnectorWithExtraFindData[]]
> = function (this: jest.MatcherContext, actual, expected) {
  const actualConnectors = actual as ConnectorWithExtraFindData[];
  const expectedConnectors = expected as Partial<ConnectorWithExtraFindData>[];

  if (actualConnectors.length !== expectedConnectors.length) {
    return {
      message: () =>
        `Expected ${expectedConnectors.length} connectors, but got ${actualConnectors.length}`,
      pass: false,
    };
  }

  for (let i = 0; i < actualConnectors.length; i++) {
    const expectedConnector = expectedConnectors[i];
    const actualConnector = actualConnectors[i];
    const expectedConnectorWithDefaultData: ConnectorWithExtraFindData = {
      id: 'test',
      actionTypeId: '.test-connector-type',
      name: 'Test Connector',
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: false,
      isConnectorTypeDeprecated: false,
      referencedByCount: 0, // This is the difference between this and toMatchConnectors
      ...expectedConnector,
    };

    const pass = this.equals(actualConnector, expectedConnectorWithDefaultData);

    if (!pass) {
      return {
        message: () =>
          `expected connector [index:${i}] does not match:\n\n${this.utils.printDiffOrStringify(
            expectedConnectorWithDefaultData,
            actualConnector,
            'Expected',
            'Received',
            true
          )}`,
        pass: false,
      };
    }
  }

  return {
    message: () => `All the connectors match the expected connectors`,
    pass: true,
  };
};

expect.extend({
  toContainConnector,
  toContainConnectors,
  toContainConnectorsFindResult,
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toContainConnector(entry: Partial<Connector>): R;
      toContainConnectors(entry: Partial<Connectors>[]): R;
      toContainConnectorsFindResult(entries: Partial<ConnectorWithExtraFindData>[]): R;
    }
  }
}
