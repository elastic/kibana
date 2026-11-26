/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawRuleSchema as rawRuleSchemaV16 } from './v16';
import { rawRuleSchema } from './v17';

describe('rawRuleSchemaV17', () => {
  const baseRule = {
    name: 'my rule',
    enabled: true,
    consumer: 'alerts',
    tags: [],
    alertTypeId: '.test',
    apiKeyOwner: 'elastic',
    apiKey: null,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    updatedAt: '2024-01-02T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    muteAll: false,
    mutedInstanceIds: [],
    throttle: null,
    revision: 0,
    schedule: {
      interval: '1m',
    },
    legacyId: null,
    actions: [],
    executionStatus: {
      status: 'pending' as const,
      lastExecutionDate: '2024-01-01T00:00:00.000Z',
      error: null,
      warning: null,
    },
    params: {},
  };

  it('keeps documents written by the previous model version valid', () => {
    const previous = rawRuleSchemaV16.validate({
      ...baseRule,
      executionStatus: {
        ...baseRule.executionStatus,
        status: 'error',
        error: { reason: 'execute', message: 'boom' },
      },
      lastRun: {
        outcome: 'failed',
        alertsCount: {},
        warning: 'execute',
      },
    });

    expect(() => rawRuleSchema.validate(previous)).not.toThrow();
  });

  it('accepts an executionStatus.error.reason the previous model version rejects', () => {
    const rule = {
      ...baseRule,
      executionStatus: {
        ...baseRule.executionStatus,
        status: 'error',
        error: { reason: 'reason-from-a-newer-kibana', message: 'boom' },
      },
    };

    expect(() => rawRuleSchemaV16.validate(rule)).toThrow();
    expect(rawRuleSchema.validate(rule).executionStatus.error?.reason).toBe(
      'reason-from-a-newer-kibana'
    );
  });

  it('accepts a lastRun.warning the previous model version rejects', () => {
    const rule = {
      ...baseRule,
      lastRun: {
        outcome: 'failed',
        alertsCount: {},
        warning: 'reason-from-a-newer-kibana',
      },
    };

    expect(() => rawRuleSchemaV16.validate(rule)).toThrow();
    expect(rawRuleSchema.validate(rule).lastRun?.warning).toBe('reason-from-a-newer-kibana');
  });

  it('accepts the configuration reason in executionStatus.error and lastRun.warning', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      executionStatus: {
        ...baseRule.executionStatus,
        status: 'error',
        error: { reason: 'configuration', message: 'boom' },
      },
      lastRun: { outcome: 'failed', alertsCount: {}, warning: 'configuration' },
    });

    expect(validated.executionStatus.error?.reason).toBe('configuration');
    expect(validated.lastRun?.warning).toBe('configuration');
  });

  it('still accepts a null lastRun.warning', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      lastRun: { outcome: 'succeeded', alertsCount: {}, warning: null },
    });

    expect(validated.lastRun?.warning).toBeNull();
  });

  it('rejects a non-string executionStatus.error.reason', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        executionStatus: {
          ...baseRule.executionStatus,
          status: 'error',
          error: { reason: 42, message: 'boom' },
        },
      })
    ).toThrow();
  });

  it('rejects an unreasonably long executionStatus.error.reason', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        executionStatus: {
          ...baseRule.executionStatus,
          status: 'error',
          error: { reason: 'a'.repeat(101), message: 'boom' },
        },
      })
    ).toThrow();
  });

  it('still validates executionStatus.warning.reason against the known values', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        executionStatus: {
          ...baseRule.executionStatus,
          status: 'warning',
          warning: { reason: 'not-a-warning-reason', message: 'careful' },
        },
      })
    ).toThrow();
  });

  it('accepts executionStatus.numberOfTriggeredActions', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      executionStatus: {
        ...baseRule.executionStatus,
        numberOfTriggeredActions: 3,
      },
    });

    expect(validated.executionStatus.numberOfTriggeredActions).toBe(3);
  });

  it('rejects a non-numeric executionStatus.numberOfTriggeredActions', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        executionStatus: {
          ...baseRule.executionStatus,
          numberOfTriggeredActions: 'three',
        },
      })
    ).toThrow();
  });
});
