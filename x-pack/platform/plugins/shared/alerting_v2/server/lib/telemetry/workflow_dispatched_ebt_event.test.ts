/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workflowDispatchedTelemetryDataSchema } from './workflow_ebt_schema';
import {
  buildWorkflowDispatchedEventData,
  workflowDispatchedTelemetryEvent,
} from './workflow_dispatched_ebt_event';

const input = {
  workflowId: 'wf-abc123',
  actionPolicyId: 'policy-1',
  workflowExecutionId: 'exec-xyz789',
  spaceId: 'default',
  ruleIds: ['rule-1', 'rule-2'],
  alertCount: 42,
  throttleStrategy: 'per_status_interval' as const,
  groupingMode: 'per_field' as const,
};

describe('workflowDispatchedTelemetryEvent', () => {
  it('registers the workflow dispatched event type', () => {
    expect(workflowDispatchedTelemetryEvent.eventType).toBe('alerting_v2_workflow_dispatched');
  });

  it('describes every payload field in the schema', () => {
    expect(Object.keys(workflowDispatchedTelemetryEvent.schema).sort()).toEqual([
      'action_policy_id',
      'alert_count',
      'grouping_mode',
      'rule_count',
      'rule_id',
      'space_id',
      'throttle_strategy',
      'workflow_execution_id',
      'workflow_id',
    ]);
  });

  it('declares rule_id as an array of keywords', () => {
    expect(workflowDispatchedTelemetryEvent.schema.rule_id).toEqual(
      expect.objectContaining({
        type: 'array',
        items: expect.objectContaining({ type: 'keyword' }),
      })
    );
  });
});

describe('buildWorkflowDispatchedEventData', () => {
  it('projects the dispatch into the event payload', () => {
    expect(buildWorkflowDispatchedEventData(input)).toEqual({
      workflow_id: 'wf-abc123',
      action_policy_id: 'policy-1',
      workflow_execution_id: 'exec-xyz789',
      space_id: 'default',
      rule_id: ['rule-1', 'rule-2'],
      alert_count: 42,
      rule_count: 2,
      throttle_strategy: 'per_status_interval',
      grouping_mode: 'per_field',
    });
  });

  it('derives rule_count from the rule ids', () => {
    expect(buildWorkflowDispatchedEventData({ ...input, ruleIds: ['rule-1'] }).rule_count).toBe(1);
    expect(buildWorkflowDispatchedEventData({ ...input, ruleIds: [] }).rule_count).toBe(0);
  });

  it('reports each rule once and counts distinct rules', () => {
    const data = buildWorkflowDispatchedEventData({
      ...input,
      ruleIds: ['rule-1', 'rule-2', 'rule-1'],
    });

    expect(data.rule_id).toEqual(['rule-1', 'rule-2']);
    expect(data.rule_count).toBe(2);
  });

  it('does not share the rule id array with the input', () => {
    const ruleIds = ['rule-1'];
    const data = buildWorkflowDispatchedEventData({ ...input, ruleIds });

    expect(data.rule_id).toEqual(ruleIds);
    expect(data.rule_id).not.toBe(ruleIds);
  });

  it('produces a payload accepted by the shared schema', () => {
    expect(
      workflowDispatchedTelemetryDataSchema.safeParse(buildWorkflowDispatchedEventData(input))
        .success
    ).toBe(true);
  });
});
