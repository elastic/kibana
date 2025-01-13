/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_FEATURE_ID,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
} from '@kbn/alerting-plugin/common';
import { ValidationResult } from '../../../../types';

export const mockedRulesData = [
  {
    id: '1',
    name: 'test rule',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      run: {
        history: [
          {
            success: true,
            duration: 1000000,
          },
          {
            success: true,
            duration: 200000,
          },
          {
            success: false,
            duration: 300000,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 300000,
        },
        last_run: {
          timestamp: '2020-08-20T19:23:38Z',
          metrics: {
            duration: 500,
          },
        },
      },
    },
    lastRun: {
      outcome: 'succeeded',
      alertsCount: {},
    },
  },
  {
    id: '2',
    name: 'test rule ok',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'ok',
      lastDuration: 61000,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      run: {
        history: [
          {
            success: true,
            duration: 100000,
          },
          {
            success: true,
            duration: 500000,
          },
        ],
        calculated_metrics: {
          success_ratio: 1,
          p50: 0,
          p95: 100000,
          p99: 500000,
        },
        last_run: {
          timestamp: '2020-08-20T19:23:38Z',
          metrics: {
            duration: 61000,
          },
        },
      },
    },
    lastRun: {
      outcome: 'succeeded',
      alertsCount: {},
    },
  },
  {
    id: '3',
    name: 'test rule pending',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'pending',
      lastDuration: 30234,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: null,
    },
    monitoring: {
      run: {
        history: [{ success: false, duration: 100 }],
        calculated_metrics: {
          success_ratio: 0,
        },
        last_run: {
          timestamp: '2020-08-20T19:23:38Z',
          metrics: {
            duration: 30234,
          },
        },
      },
    },
  },
  {
    id: '4',
    name: 'test rule error',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'error',
      lastDuration: 122000,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: {
        reason: RuleExecutionStatusErrorReasons.Unknown,
        message: 'test',
      },
    },
    lastRun: {
      outcome: 'failed',
      outcomeMsg: 'test',
      warning: RuleExecutionStatusErrorReasons.Unknown,
    },
  },
  {
    id: '5',
    name: 'test rule license error',
    tags: [],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'error',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      error: {
        reason: RuleExecutionStatusErrorReasons.License,
        message: 'test',
      },
    },
    lastRun: {
      outcome: 'failed',
      outcomeMsg: 'test',
      warning: RuleExecutionStatusErrorReasons.License,
    },
  },
  {
    id: '6',
    name: 'test rule warning',
    tags: [],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '5d' },
    actions: [{ id: 'test', group: 'rule', params: { message: 'test' } }],
    params: { name: 'test rule type name' },
    scheduledTaskId: null,
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'warning',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      warning: {
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        message: 'test',
      },
    },
    lastRun: {
      outcome: 'warning',
      outcomeMsg: 'test',
      warning: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
    },
  },
];

export const ruleTypeFromApi = {
  id: 'test_rule_type',
  name: 'some rule type',
  actionGroups: [{ id: 'default', name: 'Default' }],
  recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
  actionVariables: { context: [], state: [] },
  defaultActionGroupId: 'default',
  producer: ALERTING_FEATURE_ID,
  minimumLicenseRequired: 'basic',
  enabledInLicense: true,
  authorizedConsumers: {
    [ALERTING_FEATURE_ID]: { read: true, all: true },
  },
  ruleTaskTimeout: '1m',
};

export const getDisabledByLicenseRuleTypeFromApi = (authorized: boolean = true) => ({
  id: 'test_rule_type_disabled_by_license',
  name: 'some rule type that is not allowed',
  actionGroups: [{ id: 'default', name: 'Default' }],
  recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
  actionVariables: { context: [], state: [] },
  defaultActionGroupId: 'default',
  producer: ALERTING_FEATURE_ID,
  minimumLicenseRequired: 'platinum',
  enabledInLicense: false,
  authorizedConsumers: {
    [ALERTING_FEATURE_ID]: { read: true, all: authorized },
  },
});

export const ruleType = {
  id: 'test_rule_type',
  description: 'test',
  iconClass: 'test',
  documentationUrl: null,
  validate: (): ValidationResult => {
    return { errors: {} };
  },
  ruleParamsExpression: () => null,
  requiresAppContext: false,
};
