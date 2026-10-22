/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEvaluationEventAttributes } from './evaluation_event_attributes';

describe('toEvaluationEventAttributes', () => {
  it('maps a complete evaluation result to OTel event attributes', () => {
    expect(
      toEvaluationEventAttributes({
        monitor: { id: 'monitor-1', name: 'Correctness monitor' },
        spaceId: 'space-a',
        connectorId: 'connector-1',
        result: {
          status: 'ok',
          evaluator: {
            name: 'correctness',
            version: '1.0.0',
            kind: 'llm',
            direction: 'maximize',
            model: {
              id: 'model-1',
              family: 'model-family',
              provider: 'model-provider',
            },
            trace_id: 'fedcba9876543210fedcba9876543210',
          },
        },
        score: {
          name: 'factuality',
          score: 0.91,
          label: 'pass',
          explanation: 'The response is grounded.',
          metadata: { source: 'test', sample: 1 },
        },
      })
    ).toEqual({
      'gen_ai.evaluation.name': 'factuality',
      'gen_ai.evaluation.score.value': 0.91,
      'gen_ai.evaluation.score.label': 'pass',
      'gen_ai.evaluation.explanation': 'The response is grounded.',
      'kibana.evals.monitor.id': 'monitor-1',
      'kibana.evals.monitor.name': 'Correctness monitor',
      'kibana.evals.space_id': 'space-a',
      'kibana.evals.connector_id': 'connector-1',
      'kibana.evals.evaluator.name': 'correctness',
      'kibana.evals.evaluator.version': '1.0.0',
      'kibana.evals.evaluator.kind': 'llm',
      'kibana.evals.evaluator.direction': 'maximize',
      'kibana.evals.evaluator.model.id': 'model-1',
      'kibana.evals.evaluator.model.family': 'model-family',
      'kibana.evals.evaluator.model.provider': 'model-provider',
      'kibana.evals.evaluator.trace_id': 'fedcba9876543210fedcba9876543210',
      'kibana.evals.score.metadata': '{"source":"test","sample":1}',
    });
  });

  it('omits null and undefined optional values', () => {
    const attributes = toEvaluationEventAttributes({
      monitor: { id: 'monitor-2', name: 'Latency monitor' },
      spaceId: 'default',
      result: {
        status: 'ok',
        evaluator: {
          name: 'latency',
          version: '2.0.0',
          kind: 'code',
        },
      },
      score: {
        name: 'latency_ms',
        score: null,
      },
    });

    expect(attributes).toEqual({
      'gen_ai.evaluation.name': 'latency_ms',
      'kibana.evals.monitor.id': 'monitor-2',
      'kibana.evals.monitor.name': 'Latency monitor',
      'kibana.evals.space_id': 'default',
      'kibana.evals.evaluator.name': 'latency',
      'kibana.evals.evaluator.version': '2.0.0',
      'kibana.evals.evaluator.kind': 'code',
    });
    expect(Object.values(attributes)).not.toContain(null);
    expect(Object.values(attributes)).not.toContain(undefined);
  });
});
