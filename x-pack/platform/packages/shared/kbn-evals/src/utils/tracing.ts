/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { WithActiveSpanOptions } from '@kbn/tracing-utils';
import { ROOT_CONTEXT, context } from '@opentelemetry/api';

/**
 * Use this wrapper when you want to include trace-based metrics with evaluations and use qualitative evaluators within the
 * context of a Phoenix task. This ensures the evaluator spans get new root context and have a different trace id than the evaluated example span.
 */
export function withEvaluatorSpan(name: string, opts: WithActiveSpanOptions, cb: () => any) {
  // Execute callback in the context with baggage
  return context.with(ROOT_CONTEXT, () => {
    return withActiveInferenceSpan(
      name,
      {
        ...opts,
        attributes: {
          'inscrumentationScope.name': '@kbn/evals',
          'evaluator.name': name, // Set on this span too
          ...opts.attributes,
        },
      },
      cb
    );
  });
}
