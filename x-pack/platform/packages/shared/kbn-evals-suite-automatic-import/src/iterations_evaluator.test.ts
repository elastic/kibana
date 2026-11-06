/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createIterationsEvaluator } from './iterations_evaluator';

const TRACE_ID = '54d6274818ec86b0fad2376d3b2bedb2';

describe('createIterationsEvaluator', () => {
  it('counts the pipeline generator runs in the analysis trace', async () => {
    const query = jest.fn(async () => ({ columns: [{ name: 'iterations' }], values: [[2]] }));
    const evaluator = createIterationsEvaluator({
      traceEsClient: { esql: { query } } as unknown as Client,
      log: new ToolingLog(),
    });

    const result = await evaluator.evaluate({
      input: {},
      output: { traceId: TRACE_ID },
      expected: null,
      metadata: null,
    });

    expect(result.score).toBe(2);
    expect(query).toHaveBeenCalledWith({
      query: expect.stringMatching(
        new RegExp(`trace.id == "${TRACE_ID}"[\\s\\S]*"ingest_pipeline_generator"`)
      ),
    });
  });
});
