/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { templateToRuleResponse } from './template_to_rule_response';

const createRulePayload = (overrides: Partial<CreateRuleData> = {}): CreateRuleData =>
  ({
    kind: 'alert',
    metadata: {
      name: '[Kubernetes OTel] Pod CrashLoopBackOff',
      description: 'Alerts when containers have a high restart count.',
      tags: ['Kubernetes'],
    },
    time_field: '@timestamp',
    schedule: { every: '1m', lookback: '15m' },
    query: {
      format: 'composed',
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE restarts > 0' },
    },
    grouping: { fields: ['k8s.pod.name'] },
    recovery_strategy: 'no_breach',
    state_transition: { pending_count: 3 },
    ...overrides,
  } as CreateRuleData);

const template: RuleTemplateResponse = {
  id: 'kubernetes_otel-pod-crashloopbackoff-v2',
  engine: 'v2',
  rule: createRulePayload(),
};

describe('templateToRuleResponse', () => {
  it('spreads the template create payload and fills server-owned rule fields', () => {
    const now = '2026-08-17T00:00:00.000Z';
    const rule = templateToRuleResponse(template, now);

    expect(rule).toMatchObject({
      id: template.id,
      kind: 'alert',
      metadata: {
        name: template.rule.metadata.name,
        description: template.rule.metadata.description,
        tags: template.rule.metadata.tags,
        version: 1,
      },
      time_field: '@timestamp',
      schedule: template.rule.schedule,
      query: template.rule.query,
      grouping: template.rule.grouping,
      recovery_strategy: 'no_breach',
      enabled: true,
      created_by: null,
      created_at: now,
      updated_by: null,
      updated_at: now,
    });
  });
});
