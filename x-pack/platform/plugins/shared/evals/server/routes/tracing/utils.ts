/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JUDGE_SPAN_NAME_PREFIX } from '../../task_providers/tracing';

/**
 * Escapes Elasticsearch wildcard metacharacters (`\`, `*`, `?`) in user input
 * so the literal characters are matched rather than interpreted as wildcards.
 */
export const escapeWildcard = (input: string): string =>
  input.replace(/[\\\*\?]/g, (ch) => `\\${ch}`);

/**
 * `must_not` clause for the Tracing routes' root-span queries. Excludes evaluator
 * root spans that are NOT LLM judges: trace-metric / code evaluators (`Output
 * Tokens`, `Input Tokens`, `ContainsKibana`, …) that the offline `@kbn/evals`
 * runner wraps in a root span named after the evaluator. These are noise in the
 * Tracing UI (they're scores, not traces).
 *
 * LLM judges (`judge · correctness`, `judge · groundedness`) are kept: their
 * nested `chat <model>` span makes them valuable for debugging why a score came
 * out the way it did. They're identified by the `judge · ` span-name prefix set
 * in `withEvalsEvaluatorSpan`.
 */
export const EXCLUDE_NON_JUDGE_EVALUATOR_ROOTS: Record<string, unknown> = {
  bool: {
    filter: [{ exists: { field: 'attributes.evaluator.name' } }],
    must_not: [{ prefix: { name: JUDGE_SPAN_NAME_PREFIX } }],
  },
};
