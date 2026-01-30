/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeWithDescription } from '@kbn/alerts-ui-shared';
import { getInitialMultiConsumer } from './get_initial_multi_consumer';

describe('getInitialMultiConsumer', () => {
  const ruleType = {
    id: '.es-query',
    name: 'Test',
    actionGroups: [
      {
        id: 'testActionGroup',
        name: 'Test Action Group',
      },
      {
        id: 'recovered',
        name: 'Recovered',
      },
    ],
    defaultActionGroupId: 'testActionGroup',
    minimumLicenseRequired: 'basic',
    recoveryActionGroup: {
      id: 'recovered',
      name: 'Recovered',
    },
    producer: 'logs',
    authorizedConsumers: {
      alerting: { read: true, all: true },
      test: { read: true, all: true },
      stackAlerts: { read: true, all: true },
      logs: { read: true, all: true },
    },
    actionVariables: {
      params: [],
      state: [],
    },
    enabledInLicense: true,
    category: 'test',
    isExportable: true,
    isInternallyManaged: false,
  } as RuleTypeWithDescription;

  const ruleTypes = [
    ruleType,
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [],
      defaultActionGroupId: 'threshold met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        stackAlerts: {
          read: true,
          all: true,
        },
      },
      actionVariables: {
        params: [],
        state: [],
      },
      id: '.index-threshold',
      name: 'Index threshold',
      category: 'management',
      producer: 'stackAlerts',
      isExportable: true,
    },
  ] as RuleTypeWithDescription[];

  test('should return null when rule type id does not match', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['logs'],
      ruleType: {
        ...ruleType,
        id: 'test',
      },
      ruleTypes,
    });

    expect(res).toBe(null);
  });

  test('should return null when no valid consumers', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: [],
      ruleType,
      ruleTypes,
    });

    expect(res).toBe(null);
  });

  test('should return same valid consumer when only one valid consumer', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['alerts'],
      ruleType,
      ruleTypes,
    });

    expect(res).toBe('alerts');
  });

  test('should not return observability consumer for non serverless', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['logs', 'infrastructure'],
      ruleType,
      ruleTypes,
    });

    expect(res).toBe('logs');
  });

  test('should return valid consumer when user has only logs privileges', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['infrastructure', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {
          logs: { read: true, all: true },
        },
      },
      ruleTypes,
    });

    expect(res).toBe('logs');
  });

  test('should return valid consumer when user has only infrastructure privileges', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['infrastructure', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {
          infrastructure: { read: true, all: true },
        },
      },
      ruleTypes: ruleTypes.map((rule) => ({
        ...rule,
        authorizedConsumers: {
          infrastructure: { read: true, all: true },
        },
      })),
    });

    expect(res).toBe('infrastructure');
  });

  test('should return null when there is no authorized consumers', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['alerts', 'infrastructure'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {},
      },
      ruleTypes,
    });

    expect(res).toBe(null);
  });

  test('should return null when multiConsumerSelection is null', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['stackAlerts', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {
          stackAlerts: { read: true, all: true },
        },
      },
      ruleTypes,
    });

    expect(res).toBe(null);
  });

  test('should return valid multi consumer correctly', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: 'logs',
      validConsumers: ['stackAlerts', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {
          stackAlerts: { read: true, all: true },
        },
      },
      ruleTypes,
    });

    expect(res).toBe('logs');
  });

  test('should return stackAlerts correctly', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: 'alerts',
      validConsumers: ['stackAlerts', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {},
      },
      ruleTypes,
    });

    expect(res).toBe('stackAlerts');
  });

  test('should return null valid consumer correctly', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: 'alerts',
      validConsumers: ['infrastructure', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {},
      },
      ruleTypes: [],
    });

    expect(res).toBe(null);
  });
});
