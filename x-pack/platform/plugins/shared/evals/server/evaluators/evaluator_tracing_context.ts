/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { context as otelContext, propagation } from '@opentelemetry/api';
import { EVALUATOR_NAME_BAGGAGE_KEY } from '@kbn/inference-tracing';

/**
 * Executes `fn` within a context tagged with the running evaluator's name, so any spans
 * emitted during evaluation - e.g. the LLM-judge call in `runLlmJudge` - are marked with
 * `evaluator.name`. Trace-sampling queries (like the online-eval workflow) rely on this to
 * exclude an evaluator's own byproduct traces from being picked up as evaluation subjects.
 */
export const withEvaluatorNameBaggage = <T>(evaluatorName: string, fn: () => T): T => {
  const ctx = otelContext.active();
  const baggage = (propagation.getBaggage(ctx) ?? propagation.createBaggage()).setEntry(
    EVALUATOR_NAME_BAGGAGE_KEY,
    { value: evaluatorName }
  );
  const updatedContext = propagation.setBaggage(ctx, baggage);

  return otelContext.with(updatedContext, fn);
};
