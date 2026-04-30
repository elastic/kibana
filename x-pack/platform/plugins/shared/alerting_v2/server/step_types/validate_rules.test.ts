/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { validateRulesStepDefinition } from './validate_rules';

interface MockInput {
  insights: unknown[];
  space_id: string;
  execution_id: string;
}

const createMockContext = () => ({
  input: {
    insights: [],
    space_id: 'default',
    execution_id: 'exec-123',
  } as MockInput,
  config: {},
  rawInput: {} as any,
  contextManager: {} as any,
  logger: loggingSystemMock.createLogger(),
  abortSignal: new AbortController().signal,
  stepId: 'validate_insights',
  stepType: 'alerting_v2.validate_rules',
});

describe('validate_rules step', () => {
  it('has the correct step id', () => {
    expect(validateRulesStepDefinition.id).toBe('alerting_v2.validate_rules');
  });

  it('validates well-formed insights and enriches with space_id/execution_id', async () => {
    const context = createMockContext();
    context.input.insights = [
      {
        type: 'deduplication',
        action: 'merge',
        impact: 'high',
        confidence: 'high',
        title: 'Duplicate rules A and B',
        summary: 'Rules A and B monitor the same metric',
        justification: 'Both rules query the same index with identical conditions',
        rule_ids: ['rule-1', 'rule-2'],
        current: null,
        proposed: null,
      },
    ];

    const result = await validateRulesStepDefinition.handler(context as any);

    expect(result.output!.validInsights).toHaveLength(1);
    expect(result.output!.invalidInsights).toHaveLength(0);

    const insight = result.output!.validInsights[0] as Record<string, unknown>;
    expect(insight.space_id).toBe('default');
    expect(insight.execution_id).toBe('exec-123');
    expect(insight.status).toBe('open');
    expect(insight.insight_id).toMatch(/^insight-/);
    expect(insight['@timestamp']).toBeDefined();
  });

  it('rejects insights missing required fields', async () => {
    const context = createMockContext();
    context.input.insights = [
      {
        type: 'deduplication',
      },
    ];

    const result = await validateRulesStepDefinition.handler(context as any);

    expect(result.output!.validInsights).toHaveLength(0);
    expect(result.output!.invalidInsights).toHaveLength(1);
    expect(result.output!.invalidInsights[0].error).toBeDefined();
  });

  it('returns empty arrays for empty input', async () => {
    const context = createMockContext();

    const result = await validateRulesStepDefinition.handler(context as any);

    expect(result.output!.validInsights).toHaveLength(0);
    expect(result.output!.invalidInsights).toHaveLength(0);
  });

  it('preserves existing insight_id if provided', async () => {
    const context = createMockContext();
    context.input.insights = [
      {
        insight_id: 'my-custom-id',
        type: 'deduplication',
        action: 'merge',
        impact: 'medium',
        confidence: 'medium',
        title: 'Test',
        summary: 'Test summary',
        justification: 'Test justification',
        rule_ids: [],
        current: null,
        proposed: null,
      },
    ];

    const result = await validateRulesStepDefinition.handler(context as any);

    expect(result.output!.validInsights).toHaveLength(1);
    expect((result.output!.validInsights[0] as Record<string, unknown>).insight_id).toBe(
      'my-custom-id'
    );
  });
});
