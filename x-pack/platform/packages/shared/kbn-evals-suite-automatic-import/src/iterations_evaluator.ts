/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Evaluator } from '@kbn/evals';
import { createTraceBasedEvaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';

export const ITERATIONS_EVALUATOR_NAME = 'Iterations';

/** Each review that rejects the pipeline sends it back to this sub-agent for another pass. */
const PIPELINE_GENERATOR = 'ingest_pipeline_generator';

/** How many times the agent built the pipeline: 1 when the first pipeline passed review. */
export const createIterationsEvaluator = ({
  traceEsClient,
  log,
}: {
  traceEsClient: Client;
  log: ToolingLog;
}): Evaluator =>
  createTraceBasedEvaluator({
    traceEsClient,
    log,
    config: {
      name: ITERATIONS_EVALUATOR_NAME,
      direction: 'minimize',
      buildQuery: (traceId) => `FROM traces-*
        | WHERE trace.id == "${traceId}"
        | STATS iterations = SUM(CASE(attributes.gen_ai.agent.name == "${PIPELINE_GENERATOR}", 1, 0))`,
      extractResult: ({ columns, values }) =>
        values[0][columns.findIndex(({ name }) => name === 'iterations')],
      // Every analysis builds the pipeline at least once, so 0 means the trace isn't fully indexed yet.
      isResultValid: (result) => result !== null && result > 0,
    },
  });
