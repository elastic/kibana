/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  RuleExecutionInput,
  RuleExecutionStep,
  RulePipelineState,
  RuleStepOutput,
} from './types';
import type { QueryPayload } from './get_query_payload';
import type { AlertEvent } from '../../resources/alert_events';

export * from '../test_utils';

export function createRuleExecutionInput(
  overrides: Partial<RuleExecutionInput> = {}
): RuleExecutionInput {
  return {
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
    ...overrides,
  };
}

export function createRulePipelineState(state?: Partial<RulePipelineState>): RulePipelineState {
  return {
    input: createRuleExecutionInput(),
    ...state,
  };
}

export function createMockStep(
  name: string,
  executeFn: (state: Readonly<RulePipelineState>) => Promise<RuleStepOutput>
): RuleExecutionStep {
  return {
    name,
    execute: jest.fn(executeFn),
  };
}

export function createQueryPayload(overrides: Partial<QueryPayload> = {}): QueryPayload {
  return {
    filter: { bool: { filter: [] } },
    params: [],
    dateStart: '2024-12-31T23:55:00.000Z',
    dateEnd: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createEsqlResponse(
  columns: EsqlQueryResponse['columns'] = [{ name: 'host.name', type: 'keyword' }],
  values: EsqlQueryResponse['values'] = [['host-a'], ['host-b']]
): EsqlQueryResponse {
  return {
    columns,
    values,
  };
}

export function createAlertEvents(count: number = 2): Array<{ id: string; doc: AlertEvent }> {
  return Array.from({ length: count }, (_, i) => ({
    id: `alert-${i}`,
    doc: {
      '@timestamp': '2025-01-01T00:00:00.000Z',
      scheduled_timestamp: '2025-01-01T00:00:00.000Z',
      rule: { id: 'rule-1', version: 1 },
      group_hash: `host.name:${i}`,
      data: { 'host.name': `host-${i}` },
      status: 'breached',
      source: 'internal',
      type: 'alert',
    },
  }));
}
