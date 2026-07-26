/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALLOWED_MAX_ALERTS,
  MAX_SNOOZED_INSTANCE_CONDITIONS,
  MAX_SNOOZED_INSTANCE_ID_LENGTH,
  MAX_SNOOZED_BY_LENGTH,
  MAX_SNOOZED_CONDITION_FIELD_LENGTH,
} from '../../../../common/max_alert_limit';
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

  it('accepts a valid ISO snoozedAt without expiresAt', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).not.toThrow();
  });

  it('accepts a valid ISO expiresAt alongside a valid ISO snoozedAt', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            expiresAt: '2024-01-03T00:00:00.000Z',
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).not.toThrow();
  });

  it('rejects snoozedInstances when conditions exceed the schema max', () => {
    const conditions = Array.from({ length: MAX_SNOOZED_INSTANCE_CONDITIONS + 1 }, () => ({
      type: 'severity_change' as const,
    }));

    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            conditions,
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when the array exceeds the schema max', () => {
    const snoozedInstances = Array.from({ length: ALLOWED_MAX_ALERTS + 1 }, (_, i) => ({
      instanceId: `alert-${i}`,
      snoozedAt: '2024-01-02T12:00:00.000Z',
      snoozedBy: 'elastic',
    }));

    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances,
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when snoozedAt is not a valid ISO date', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            snoozedAt: 'not-a-date',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when snoozedAt is a valid date but not ISO format', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            snoozedAt: 'Jan 2 2024 12:00:00',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when expiresAt is not a valid ISO date', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            expiresAt: 'not-a-date',
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when expiresAt is a valid date but not ISO format', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            expiresAt: 'Jan 3 2024 12:00:00',
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when instanceId exceeds max length', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'a'.repeat(MAX_SNOOZED_INSTANCE_ID_LENGTH + 1),
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when snoozedBy exceeds max length', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'a'.repeat(MAX_SNOOZED_BY_LENGTH + 1),
          },
        ],
      })
    ).toThrow();
  });

  it('rejects snoozedInstances when a field_change condition field exceeds max length', () => {
    expect(() =>
      rawRuleSchema.validate({
        ...baseRule,
        snoozedInstances: [
          {
            instanceId: 'alert-1',
            conditions: [
              { type: 'field_change', field: 'a'.repeat(MAX_SNOOZED_CONDITION_FIELD_LENGTH + 1) },
            ],
            snoozedAt: '2024-01-02T12:00:00.000Z',
            snoozedBy: 'elastic',
          },
        ],
      })
    ).toThrow();
  });
});
