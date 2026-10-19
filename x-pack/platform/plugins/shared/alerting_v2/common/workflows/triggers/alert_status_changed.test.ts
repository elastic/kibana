/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertStatusChangedTriggerId,
  alertStatusChangedEventSchema,
  alertStatusChangedTriggerCommonDefinition,
  type AlertStatusChangedTriggerPayload,
} from './alert_status_changed';

const rulePayload: AlertStatusChangedTriggerPayload = {
  spaceId: 'default',
  source: 'internal',
  alert: {
    id: 'alert-1',
    groupHash: 'hash-1',
    status: 'active',
    previousStatus: 'pending',
  },
  rule: { id: 'rule-1', name: 'CPU above 90%', tags: ['k8s'] },
  execution: { executionId: 'execution-1', scheduledAt: '2026-10-15T10:00:00.000Z' },
};

const clientPayload: AlertStatusChangedTriggerPayload = {
  spaceId: 'default',
  source: 'datadog',
  alert: {
    id: 'alert-2',
    groupHash: 'hash-2',
    status: 'active',
    previousStatus: null,
  },
  rule: null,
  execution: null,
};

describe('alertStatusChangedTriggerCommonDefinition', () => {
  it('uses the alerting.alertStatusChanged id', () => {
    expect(alertStatusChangedTriggerCommonDefinition.id).toBe('alerting.alertStatusChanged');
    expect(AlertStatusChangedTriggerId).toBe('alerting.alertStatusChanged');
  });

  it('accepts a payload from a rule run', () => {
    expect(alertStatusChangedEventSchema.parse(rulePayload)).toEqual(rulePayload);
  });

  it('accepts a payload from the alert events client, with no rule or execution', () => {
    expect(alertStatusChangedEventSchema.parse(clientPayload)).toEqual(clientPayload);
  });

  it('rejects a status outside the alert lifecycle', () => {
    const result = alertStatusChangedEventSchema.safeParse({
      ...rulePayload,
      alert: { ...rulePayload.alert, status: 'recovered' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = alertStatusChangedEventSchema.safeParse({ ...rulePayload, extra: true });

    expect(result.success).toBe(false);
  });

  it('documents conditions against the event payload', () => {
    expect(alertStatusChangedTriggerCommonDefinition.snippets?.condition).toMatch(/^event\./);

    for (const example of alertStatusChangedTriggerCommonDefinition.documentation?.examples ?? []) {
      expect(example).toContain(`type: ${AlertStatusChangedTriggerId}`);
      expect(example).toMatch(/condition: 'event\./);
    }
  });
});
