/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import {
  POLICY_EXECUTION_FIELDS,
  POLICY_RECORD_EXTRA_FIELDS,
  policyExecutionToDataTableRecord,
} from './policy_executions_data_view';

const buildItem = (
  overrides: Partial<PolicyExecutionHistoryItem> = {}
): PolicyExecutionHistoryItem => ({
  dispatched_at: '2026-05-05T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  rules: [{ id: 'rule-1', name: 'My Rule' }],
  total_rule_count: 1,
  outcome: 'dispatched',
  episode_count: 3,
  episodes: [],
  action_group_count: 2,
  workflows: [{ id: 'wf-1', name: 'My Workflow' }],
  ...overrides,
});

describe('policyExecutionToDataTableRecord', () => {
  it('synthesizes a stable record id from policy id, dispatched_at, and page index', () => {
    expect(policyExecutionToDataTableRecord(buildItem(), 2).id).toBe(
      'policy-1:2026-05-05T10:00:00.000Z:2'
    );
  });

  it('carries the full item in `raw._source` so the grid copy-as-JSON serializes the real record', () => {
    const item = buildItem();
    const record = policyExecutionToDataTableRecord(item, 0);

    expect(record.raw._source).toBe(item);
    expect(JSON.stringify(record.raw._source)).toEqual(JSON.stringify(item));
  });

  it('flattens the structured columns and the renderer-only extras', () => {
    const item = buildItem({
      failure_reason: 'workflow_not_found',
      error: { message: 'Workflow not found' },
    });
    const record = policyExecutionToDataTableRecord(item, 0);

    expect(record.flattened[POLICY_EXECUTION_FIELDS.policy]).toBe(item.policy);
    expect(record.flattened[POLICY_EXECUTION_FIELDS.rules]).toBe(item.rules);
    expect(record.flattened[POLICY_EXECUTION_FIELDS.workflows]).toBe(item.workflows);
    expect(record.flattened[POLICY_RECORD_EXTRA_FIELDS.totalRuleCount]).toBe(1);
    expect(record.flattened[POLICY_RECORD_EXTRA_FIELDS.failureReason]).toBe('workflow_not_found');
    expect(record.flattened[POLICY_RECORD_EXTRA_FIELDS.errorMessage]).toBe('Workflow not found');
  });
});
