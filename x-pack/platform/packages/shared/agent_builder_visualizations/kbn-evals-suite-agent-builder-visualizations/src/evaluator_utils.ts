/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult } from '@kbn/evals';

/** Shared result for evaluators with nothing to check; `null` keeps them out of averages. */
export const skippedResult = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'skipped',
  explanation,
});
