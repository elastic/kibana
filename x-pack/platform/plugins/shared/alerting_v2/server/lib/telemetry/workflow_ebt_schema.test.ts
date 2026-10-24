/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';
import { workflowDispatchedTelemetryDataSchema } from './workflow_ebt_schema';

const validData = {
  workflow_id: 'wf-abc123',
  action_policy_id: 'policy-1',
  workflow_execution_id: 'exec-xyz789',
  space_id: 'default',
  rule_id: ['rule-1', 'rule-2'],
  alert_count: 42,
  rule_count: 2,
  throttle_strategy: 'per_status_interval',
  grouping_mode: 'per_field',
};

describe('workflowDispatchedTelemetryDataSchema', () => {
  it('accepts a complete payload', () => {
    expect(workflowDispatchedTelemetryDataSchema.parse(validData)).toEqual(validData);
  });

  it('accepts an empty rule id list and zero counts', () => {
    const data = { ...validData, rule_id: [], alert_count: 0, rule_count: 0 };
    expect(workflowDispatchedTelemetryDataSchema.parse(data)).toEqual(data);
  });

  it.each(Object.keys(validData))('rejects a payload missing %s', (field) => {
    const { [field]: _omitted, ...data } = validData as Record<string, unknown>;
    expect(workflowDispatchedTelemetryDataSchema.safeParse(data).success).toBe(false);
  });

  it.each(['workflow_id', 'action_policy_id', 'workflow_execution_id', 'space_id'])(
    'rejects an empty or too long %s',
    (field) => {
      expect(
        workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, [field]: '' }).success
      ).toBe(false);
      expect(
        workflowDispatchedTelemetryDataSchema.safeParse({
          ...validData,
          [field]: 'a'.repeat(ID_MAX_LENGTH + 1),
        }).success
      ).toBe(false);
    }
  );

  it.each(['on_status_change', 'per_status_interval', 'time_interval', 'every_time'])(
    'accepts the %s throttle strategy',
    (throttleStrategy) => {
      expect(
        workflowDispatchedTelemetryDataSchema.safeParse({
          ...validData,
          throttle_strategy: throttleStrategy,
        }).success
      ).toBe(true);
    }
  );

  it.each(['per_alert', 'all', 'per_field'])('accepts the %s grouping mode', (groupingMode) => {
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, grouping_mode: groupingMode })
        .success
    ).toBe(true);
  });

  it('rejects an unknown throttle strategy or grouping mode', () => {
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, throttle_strategy: 'weekly' })
        .success
    ).toBe(false);
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, grouping_mode: 'per_host' })
        .success
    ).toBe(false);
  });

  it('rejects a rule_id that is not an array', () => {
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, rule_id: 'rule-1' }).success
    ).toBe(false);
  });

  it.each([-1, 1.5, '2'])('rejects an invalid count %p', (value) => {
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, alert_count: value }).success
    ).toBe(false);
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse({ ...validData, rule_count: value }).success
    ).toBe(false);
  });
});
