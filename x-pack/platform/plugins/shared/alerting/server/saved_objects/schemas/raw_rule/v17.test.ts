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

  const configurationError = {
    reason: 'configuration',
    message: 'Index pattern does not match any indices',
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

  it('accepts the configuration error reason in executionStatus.error', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      executionStatus: {
        ...baseRule.executionStatus,
        status: 'error',
        error: configurationError,
      },
    });

    expect(validated.executionStatus.error).toEqual(configurationError);
  });

  it('accepts the configuration error reason in lastRun.warning', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      lastRun: {
        outcome: 'failed',
        alertsCount: {},
        warning: 'configuration',
      },
    });

    expect(validated.lastRun?.warning).toBe('configuration');
  });

  it('rejects an unknown error reason', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        executionStatus: {
          ...baseRule.executionStatus,
          status: 'error',
          error: { reason: 'not-a-reason', message: 'boom' },
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
