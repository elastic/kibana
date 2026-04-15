/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawRuleSchema } from './v12';

describe('rawRuleSchemaV12', () => {
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

  it('accepts snoozedInstances', () => {
    const validated = rawRuleSchema.validate({
      ...baseRule,
      snoozedInstances: [
        {
          instanceId: 'alert-1',
          expiresAt: '2024-01-03T00:00:00.000Z',
          conditions: [
            { type: 'field_change', field: 'kibana.alert.status' },
            { type: 'severity_equals', value: 'info' },
          ],
          conditionOperator: 'any',
          snoozeSnapshot: {
            'kibana.alert.status': 'active',
            nested: {
              value: 1,
            },
          },
          snoozedAt: '2024-01-02T12:00:00.000Z',
          snoozedBy: 'elastic',
        },
      ],
    });

    expect(validated.snoozedInstances).toEqual([
      {
        instanceId: 'alert-1',
        expiresAt: '2024-01-03T00:00:00.000Z',
        conditions: [
          { type: 'field_change', field: 'kibana.alert.status' },
          { type: 'severity_equals', value: 'info' },
        ],
        conditionOperator: 'any',
        snoozeSnapshot: {
          'kibana.alert.status': 'active',
          nested: {
            value: 1,
          },
        },
        snoozedAt: '2024-01-02T12:00:00.000Z',
        snoozedBy: 'elastic',
      },
    ]);
  });

  it('keeps older documents valid when snoozedInstances is absent', () => {
    expect(() => rawRuleSchema.validate(baseRule)).not.toThrow();
  });
});
