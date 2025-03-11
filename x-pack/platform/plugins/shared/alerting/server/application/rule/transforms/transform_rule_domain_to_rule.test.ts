/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRuleDomainToRule } from './transform_rule_domain_to_rule';
import { RuleDomain } from '../types';

describe('transformRuleDomainToRule', () => {
  const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');
  const defaultAction = {
    uuid: '1',
    group: 'default',
    id: '1',
    actionTypeId: '.test',
    params: {},
    frequency: {
      summary: false,
      notifyWhen: 'onThrottleInterval' as const,
      throttle: '1m',
    },
    alertsFilter: {
      query: {
        kql: 'test:1',
        dsl: '{}',
        filters: [],
      },
    },
  };

  const systemAction = {
    id: '2',
    uuid: '123',
    actionTypeId: '.test-system-action',
    params: {},
  };

  const rule: RuleDomain<{}> = {
    id: 'test',
    enabled: false,
    name: 'my rule name',
    tags: ['foo'],
    alertTypeId: 'myType',
    consumer: 'myApp',
    schedule: { interval: '1m' },
    actions: [defaultAction],
    systemActions: [systemAction],
    params: {},
    mapped_params: {},
    createdBy: 'user',
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    legacyId: 'legacyId',
    muteAll: false,
    mutedInstanceIds: [],
    snoozeSchedule: [],
    scheduledTaskId: 'task-123',
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending' as const,
    },
    throttle: null,
    notifyWhen: null,
    revision: 0,
    updatedBy: 'user',
    apiKey: MOCK_API_KEY,
    apiKeyOwner: 'user',
    flapping: {
      lookBackWindow: 20,
      statusChangeThreshold: 20,
    },
  };

  it('should transform rule domain to rule', () => {
    const result = transformRuleDomainToRule(rule);

    expect(result).toEqual({
      id: 'test',
      enabled: false,
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      consumer: 'myApp',
      schedule: { interval: '1m' },
      actions: [defaultAction],
      systemActions: [systemAction],
      params: {},
      mapped_params: {},
      createdBy: 'user',
      createdAt: new Date('2019-02-12T21:01:22.479Z'),
      updatedAt: new Date('2019-02-12T21:01:22.479Z'),
      muteAll: false,
      mutedInstanceIds: [],
      snoozeSchedule: [],
      scheduledTaskId: 'task-123',
      executionStatus: {
        lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
        status: 'pending' as const,
      },
      throttle: null,
      notifyWhen: null,
      revision: 0,
      updatedBy: 'user',
      apiKeyOwner: 'user',
      flapping: {
        lookBackWindow: 20,
        statusChangeThreshold: 20,
      },
    });
  });

  it('should remove public fields if isPublic is true', () => {
    const result = transformRuleDomainToRule(rule, {
      isPublic: true,
    });

    expect(result).toEqual({
      id: 'test',
      enabled: false,
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      consumer: 'myApp',
      schedule: { interval: '1m' },
      actions: [defaultAction],
      systemActions: [systemAction],
      params: {},
      mapped_params: {},
      createdBy: 'user',
      createdAt: new Date('2019-02-12T21:01:22.479Z'),
      updatedAt: new Date('2019-02-12T21:01:22.479Z'),
      muteAll: false,
      mutedInstanceIds: [],
      scheduledTaskId: 'task-123',
      executionStatus: {
        lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
        status: 'pending' as const,
      },
      throttle: null,
      notifyWhen: null,
      revision: 0,
      updatedBy: 'user',
      apiKeyOwner: 'user',
      flapping: {
        lookBackWindow: 20,
        statusChangeThreshold: 20,
      },
    });
  });

  it('should include legacy id if includeLegacyId is true', () => {
    const result = transformRuleDomainToRule(rule, {
      includeLegacyId: true,
    });

    expect(result).toEqual({
      id: 'test',
      enabled: false,
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      consumer: 'myApp',
      schedule: { interval: '1m' },
      legacyId: 'legacyId',
      actions: [defaultAction],
      systemActions: [systemAction],
      params: {},
      mapped_params: {},
      createdBy: 'user',
      createdAt: new Date('2019-02-12T21:01:22.479Z'),
      updatedAt: new Date('2019-02-12T21:01:22.479Z'),
      muteAll: false,
      mutedInstanceIds: [],
      snoozeSchedule: [],
      scheduledTaskId: 'task-123',
      executionStatus: {
        lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
        status: 'pending' as const,
      },
      throttle: null,
      notifyWhen: null,
      revision: 0,
      updatedBy: 'user',
      apiKeyOwner: 'user',
      flapping: {
        lookBackWindow: 20,
        statusChangeThreshold: 20,
      },
    });
  });
});
