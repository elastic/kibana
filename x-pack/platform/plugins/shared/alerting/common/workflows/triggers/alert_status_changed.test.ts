/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertStatusChangedV1TriggerId,
  alertStatusChangedV1EventSchema,
  alertStatusChangedV1TriggerDefinition,
} from './alert_status_changed';

const validActivePayload = {
  rule: {
    id: 'rule-1',
    name: 'My Rule',
    spaceId: 'default',
    consumer: 'alerts',
    ruleTypeId: '.es-query',
    tags: ['k8s', 'prod'],
    ruleCategory: 'Elasticsearch query',
  },
  alert: {
    id: 'alert-instance-1',
    uuid: 'uuid-1234',
    status: 'active',
    actionGroup: 'default',
    start: '2025-01-01T00:00:00.000Z',
  },
};

describe('alertStatusChangedV1TriggerDefinition', () => {
  it('has a stable trigger ID', () => {
    expect(alertStatusChangedV1TriggerDefinition.id).toBe(AlertStatusChangedV1TriggerId);
    expect(alertStatusChangedV1TriggerDefinition.id).toBe('alerting.v1.alertStatusChanged');
  });

  it('has required metadata fields set', () => {
    expect(alertStatusChangedV1TriggerDefinition.title).toBeTruthy();
    expect(alertStatusChangedV1TriggerDefinition.description).toBeTruthy();
    expect(alertStatusChangedV1TriggerDefinition.stability).toBe('tech_preview');
    expect(alertStatusChangedV1TriggerDefinition.eventSchema).toBeDefined();
  });

  it('has documentation examples that use the event. prefix in KQL conditions', () => {
    const examples = alertStatusChangedV1TriggerDefinition.documentation?.examples ?? [];
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) {
      expect(example).toMatch(/event\./);
    }
  });

  it('has a snippets.condition that uses the event. prefix', () => {
    expect(alertStatusChangedV1TriggerDefinition.snippets?.condition).toMatch(/^event\./);
  });
});

describe('alertStatusChangedV1EventSchema', () => {
  describe('valid payloads', () => {
    it('accepts a valid active payload and round-trips cleanly', () => {
      const parsed = alertStatusChangedV1EventSchema.parse(validActivePayload);
      expect(parsed).toEqual(validActivePayload);
    });

    it('accepts a recovered payload with null actionGroup and null start', () => {
      const recovered = {
        ...validActivePayload,
        alert: { ...validActivePayload.alert, status: 'recovered', actionGroup: null, start: null },
      };
      expect(() => alertStatusChangedV1EventSchema.parse(recovered)).not.toThrow();
    });

    it('accepts an active payload with null actionGroup (not yet scheduled)', () => {
      const noGroup = {
        ...validActivePayload,
        alert: { ...validActivePayload.alert, actionGroup: null },
      };
      expect(() => alertStatusChangedV1EventSchema.parse(noGroup)).not.toThrow();
    });

    it('accepts an empty tags array', () => {
      const noTags = { ...validActivePayload, rule: { ...validActivePayload.rule, tags: [] } };
      expect(() => alertStatusChangedV1EventSchema.parse(noTags)).not.toThrow();
    });
  });

  describe('invalid payloads', () => {
    it('rejects an unknown alert status', () => {
      const bad = {
        ...validActivePayload,
        alert: { ...validActivePayload.alert, status: 'pending' },
      };
      expect(() => alertStatusChangedV1EventSchema.parse(bad)).toThrow();
    });

    it('rejects a payload missing alert.uuid', () => {
      const { uuid: _omit, ...alertNoUuid } = validActivePayload.alert;
      expect(() =>
        alertStatusChangedV1EventSchema.parse({ ...validActivePayload, alert: alertNoUuid })
      ).toThrow();
    });

    it('rejects a payload missing rule.id', () => {
      const { id: _omit, ...ruleNoId } = validActivePayload.rule;
      expect(() =>
        alertStatusChangedV1EventSchema.parse({ ...validActivePayload, rule: ruleNoId })
      ).toThrow();
    });

    it('rejects a payload where alert.actionGroup is absent (must be null or string, not undefined)', () => {
      const { actionGroup: _omit, ...alertNoGroup } = validActivePayload.alert;
      expect(() =>
        alertStatusChangedV1EventSchema.parse({ ...validActivePayload, alert: alertNoGroup })
      ).toThrow();
    });

    it('rejects a payload where alert.start is absent (must be null or string, not undefined)', () => {
      const { start: _omit, ...alertNoStart } = validActivePayload.alert;
      expect(() =>
        alertStatusChangedV1EventSchema.parse({ ...validActivePayload, alert: alertNoStart })
      ).toThrow();
    });
  });
});
