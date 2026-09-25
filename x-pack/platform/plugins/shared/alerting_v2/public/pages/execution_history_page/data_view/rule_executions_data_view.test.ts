/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionView } from '@kbn/alerting-v2-schemas';
import { RULES_SUCCESS_MESSAGE, RULES_MESSAGE_PLACEHOLDER } from '../translations';
import { RULE_EXECUTION_FIELDS, ruleExecutionToDataTableRecord } from './rule_executions_data_view';

const buildItem = (overrides: Partial<RuleExecutionView> = {}): RuleExecutionView => ({
  id: 'exec-1',
  rule: { id: 'rule-1', version: null },
  space_id: 'default',
  started_at: '2026-05-05T10:00:00.000Z',
  ended_at: '2026-05-05T10:00:01.500Z',
  timings: { duration_ms: 1500, scheduled_delay_ms: 0 },
  outcome: 'success',
  reason: 'Completed successfully',
  error: null,
  ...overrides,
});

describe('ruleExecutionToDataTableRecord', () => {
  it('uses the execution id as the record id', () => {
    expect(ruleExecutionToDataTableRecord(buildItem()).id).toBe('exec-1');
  });

  it('carries the full item in `raw._source` so the grid copy-as-JSON serializes the real record', () => {
    const item = buildItem();
    const record = ruleExecutionToDataTableRecord(item);

    expect(record.raw._source).toBe(item);
    expect(JSON.stringify(record.raw._source)).toEqual(JSON.stringify(item));
  });

  it('flattens the display fields', () => {
    const record = ruleExecutionToDataTableRecord(buildItem());

    expect(record.flattened).toEqual({
      [RULE_EXECUTION_FIELDS.startedAt]: '2026-05-05T10:00:00.000Z',
      [RULE_EXECUTION_FIELDS.ruleId]: 'rule-1',
      [RULE_EXECUTION_FIELDS.duration]: 1500,
      [RULE_EXECUTION_FIELDS.outcome]: 'success',
      [RULE_EXECUTION_FIELDS.message]: 'Completed successfully',
    });
  });

  it('prefers the error message for the flattened message when present', () => {
    const record = ruleExecutionToDataTableRecord(
      buildItem({
        outcome: 'failure',
        reason: 'ignored when error is present',
        error: { message: 'Index not found', stack_trace: null },
      })
    );

    expect(record.flattened[RULE_EXECUTION_FIELDS.message]).toBe('Index not found');
  });

  it('resolves the flattened message to the generic success text for a success with no error/reason', () => {
    const record = ruleExecutionToDataTableRecord(
      buildItem({ outcome: 'success', reason: null, error: null })
    );

    // The message column carries the final displayed text so it is what gets copied.
    expect(record.flattened[RULE_EXECUTION_FIELDS.message]).toBe(RULES_SUCCESS_MESSAGE);
  });

  it('resolves the flattened message to the placeholder for a non-success with no error/reason', () => {
    const record = ruleExecutionToDataTableRecord(
      buildItem({ outcome: 'failure', reason: null, error: null })
    );

    expect(record.flattened[RULE_EXECUTION_FIELDS.message]).toBe(RULES_MESSAGE_PLACEHOLDER);
  });
});
