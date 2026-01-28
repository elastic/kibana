/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { BuildAlertsStep } from './build_alerts_step';
import type { RulePipelineState } from '../types';
import type { RuleResponse } from '../../rules_client';
import { createRuleResponse, createRuleExecutionInput, createEsqlResponse } from '../test_utils';

describe('BuildAlertsStep', () => {
  let step: BuildAlertsStep;

  const createState = (
    rule?: RuleResponse,
    esqlResponse?: ESQLSearchResponse
  ): RulePipelineState => ({
    input: createRuleExecutionInput(),
    rule,
    esqlResponse,
  });

  beforeEach(() => {
    step = new BuildAlertsStep();
  });

  it('builds alert events from esql response', async () => {
    const state = createState(createRuleResponse(), createEsqlResponse());

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: alertEvents exists
    const { alertEvents } = result.data;
    expect(alertEvents).toHaveLength(2);
    expect(alertEvents[0]).toHaveProperty('id');
    expect(alertEvents[0]).toHaveProperty('doc');
  });

  it('returns empty array when esql response has no values', async () => {
    const emptyResponse = createEsqlResponse([{ name: 'host.name', type: 'keyword' }], []);
    const state = createState(createRuleResponse(), emptyResponse);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: alertEvents exists
    const { alertEvents } = result.data;
    expect(alertEvents).toHaveLength(0);
  });

  it('returns empty array when esql response has no columns', async () => {
    const emptyResponse = createEsqlResponse([], []);
    const state = createState(createRuleResponse(), emptyResponse);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: alertEvents exists
    const { alertEvents } = result.data;
    expect(alertEvents).toHaveLength(0);
  });

  it('includes rule metadata in alert events', async () => {
    const rule = createRuleResponse();
    const state = createState(rule, createEsqlResponse());

    const result = await step.execute(state);

    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: alertEvents exists
    const { alertEvents } = result.data;
    expect(alertEvents[0].doc.rule).toEqual({ id: rule.id, version: 1 });
    expect(alertEvents[0].doc.type).toBe('signal');
  });

  it('includes group hash for alert grouping', async () => {
    const rule = createRuleResponse({ groupingKey: ['host.name', 'service.name'] });
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

    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: alertEvents exists
    const { alertEvents } = result.data;
    expect(alertEvents[0].doc.group_hash).toEqual(expect.any(String));
  });

  it('throws when rule is missing from state', async () => {
    const state = createState(undefined, createEsqlResponse());

    await expect(step.execute(state)).rejects.toThrow(
      'BuildAlertsStep requires rule from previous step'
    );
  });

  it('throws when esqlResponse is missing from state', async () => {
    const state = createState(createRuleResponse(), undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'BuildAlertsStep requires esqlResponse from previous step'
    );
  });

  it('has correct step name', () => {
    expect(step.name).toBe('build_alerts');
  });
});
