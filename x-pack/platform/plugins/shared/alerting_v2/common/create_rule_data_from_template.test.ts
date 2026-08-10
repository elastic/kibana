/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleDataSchema, ruleTemplateDataSchema } from '@kbn/alerting-v2-schemas';
import { createRuleDataFromTemplate } from './create_rule_data_from_template';

const exampleTemplateAttributes = {
  engine: 'v2' as const,
  rule: {
    kind: 'alert' as const,
    metadata: {
      name: '[Kubernetes OTel] Pod CrashLoopBackOff',
      description: 'Alerts when containers have a high restart count, indicating CrashLoopBackOff.',
      tags: ['Kubernetes'],
    },
    schedule: {
      every: '1m',
      lookback: '15m',
    },
    state_transition: {
      pending_count: 3,
    },
    recovery_strategy: 'no_breach' as const,
    artifacts: [
      {
        id: 'kubernetes_otel-pod-crashloopbackoff-v2-runbook',
        type: 'runbook',
        value: '## Pod CrashLoopBackOff\n\n### Triage Steps\n1. Identify the affected pod(s).',
      },
    ],
    query: {
      format: 'composed' as const,
      base: 'TS metrics-k8sclusterreceiver.otel-*\n| STATS restarts = MAX(k8s.container.restarts)\n    BY k8s.pod.name, k8s.container.name, k8s.namespace.name',
      breach: {
        segment:
          'WHERE restarts > 0\n| SORT restarts DESC\n| KEEP k8s.namespace.name, k8s.pod.name, k8s.container.name, restarts\n| LIMIT 50',
      },
    },
    grouping: {
      fields: ['k8s.pod.name', 'k8s.container.name', 'k8s.namespace.name'],
    },
    time_field: '@timestamp',
  },
};

describe('createRuleDataFromTemplate', () => {
  it('uses template.rule with createRuleDataSchema', () => {
    const template = ruleTemplateDataSchema.parse(exampleTemplateAttributes);
    const createData = createRuleDataFromTemplate(template);

    expect(createData).not.toHaveProperty('engine');
    expect(() => createRuleDataSchema.parse(createData)).not.toThrow();
    expect(createData.recovery_strategy).toBe('no_breach');
    expect(createData.kind).toBe('alert');
  });
});
