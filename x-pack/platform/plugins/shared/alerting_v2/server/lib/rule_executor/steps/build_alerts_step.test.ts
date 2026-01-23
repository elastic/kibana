/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { BuildAlertsStep } from './build_alerts_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import type { RuleResponse } from '../../rules_client';

describe('BuildAlertsStep', () => {
  const createInput = (): RuleExecutionInput => ({
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
  });

  const createRule = (overrides: Partial<RuleResponse> = {}): RuleResponse => ({
    id: 'rule-1',
    name: 'test-rule',
    tags: ['tag1', 'tag2'],
    schedule: { custom: '1m' },
    enabled: true,
    query: 'FROM logs-* | LIMIT 10',
    timeField: '@timestamp',
    lookbackWindow: '5m',
    groupingKey: ['host.name'],
    createdBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createEsqlResponse = (
    columns: Array<{ name: string; type: string }> = [{ name: 'host.name', type: 'keyword' }],
    values: unknown[][] = [['host-a'], ['host-b']]
  ): ESQLSearchResponse => ({
    columns,
    values,
  });

  const createState = (
    rule?: RuleResponse,
    esqlResponse?: ESQLSearchResponse
  ): RulePipelineState => ({
    input: createInput(),
    rule,
    esqlResponse,
  });

  it('builds alert events from esql response', async () => {
    const step = new BuildAlertsStep();
    const state = createState(createRule(), createEsqlResponse());

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');

    if (result.type !== 'continue') throw new Error('Expected continue');
    const { alertEvents } = result.data as { alertEvents: Array<{ id: string; doc: unknown }> };
    expect(alertEvents).toHaveLength(2);
    expect(alertEvents[0]).toHaveProperty('id');
    expect(alertEvents[0]).toHaveProperty('doc');
  });

  it('returns empty array when esql response has no values', async () => {
    const step = new BuildAlertsStep();
    const emptyResponse = createEsqlResponse([{ name: 'host.name', type: 'keyword' }], []);
    const state = createState(createRule(), emptyResponse);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') throw new Error('Expected continue');
    const { alertEvents } = result.data as { alertEvents: unknown[] };
    expect(alertEvents).toHaveLength(0);
  });

  it('returns empty array when esql response has no columns', async () => {
    const step = new BuildAlertsStep();
    const emptyResponse = createEsqlResponse([], []);
    const state = createState(createRule(), emptyResponse);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') throw new Error('Expected continue');
    const { alertEvents } = result.data as { alertEvents: unknown[] };
    expect(alertEvents).toHaveLength(0);
  });

  it('includes rule tags in alert events', async () => {
    const step = new BuildAlertsStep();
    const rule = createRule({ tags: ['production', 'critical'] });
    const state = createState(rule, createEsqlResponse());

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('Expected continue');
    const { alertEvents } = result.data as {
      alertEvents: Array<{ id: string; doc: { tags?: string[] } }>;
    };
    expect(alertEvents[0].doc.tags).toEqual(['production', 'critical']);
  });

  it('uses groupingKey for alert grouping', async () => {
    const step = new BuildAlertsStep();
    const rule = createRule({ groupingKey: ['host.name', 'service.name'] });
    const esqlResponse = createEsqlResponse(
      [
        { name: 'host.name', type: 'keyword' },
        { name: 'service.name', type: 'keyword' },
      ],
      [
        ['host-a', 'service-1'],
        ['host-b', 'service-2'],
      ]
    );
    const state = createState(rule, esqlResponse);

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('Expected continue');
    const { alertEvents } = result.data as {
      alertEvents: Array<{ id: string; doc: { grouping?: { key: string; value: string } } }>;
    };
    expect(alertEvents[0].doc.grouping?.key).toBe('host.name|service.name');
  });

  it('throws when rule is missing from state', async () => {
    const step = new BuildAlertsStep();
    const state = createState(undefined, createEsqlResponse());

    await expect(step.execute(state)).rejects.toThrow(
      'BuildAlertsStep requires rule from previous step'
    );
  });

  it('throws when esqlResponse is missing from state', async () => {
    const step = new BuildAlertsStep();
    const state = createState(createRule(), undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'BuildAlertsStep requires esqlResponse from previous step'
    );
  });

  it('has correct step name', () => {
    const step = new BuildAlertsStep();
    expect(step.name).toBe('build_alerts');
  });
});
