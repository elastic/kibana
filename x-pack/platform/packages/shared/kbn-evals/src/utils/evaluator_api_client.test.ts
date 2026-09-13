/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { EvaluatorApiClient } from './evaluator_api_client';

describe('EvaluatorApiClient', () => {
  it('exposes the evaluator version returned by the evaluate API', async () => {
    const request = jest.fn().mockResolvedValue({
      data: {
        results: [
          {
            status: 'ok',
            evaluator: { name: 'tone', version: '1.2.0', kind: 'llm' },
            scores: [{ name: 'tone', score: 0.8 }],
          },
        ],
      },
    });
    const client = new EvaluatorApiClient(
      { request } as unknown as KbnClient,
      { error: jest.fn() } as unknown as SomeDevLog
    );
    const [evaluator] = client.toEvaluators([
      { name: 'tone', kind: 'LLM', direction: 'maximize', connectorId: 'connector-1' },
    ]);

    expect(evaluator.getVersion?.()).toBeUndefined();

    await evaluator.evaluate({
      input: {},
      output: { traceId: '1234567890abcdef1234567890abcdef' },
      expected: null,
      metadata: null,
    });

    expect(evaluator.getVersion?.()).toBe('1.2.0');
  });
});
