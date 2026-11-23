/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { DecisionAnswersFor, DecisionQuestion } from '@kbn/inference-common';

export interface DecideParams<Q extends readonly DecisionQuestion[] = readonly DecisionQuestion[]> {
  /** The request whose user the decision model is called as. */
  request: KibanaRequest;
  /** The text the decision model reads. */
  input: string;
  /** The questions to ask about the input, in one call. */
  questions: Q;
  abortSignal?: AbortSignal;
}

/**
 * Outcome of a decision, with one answer per question in the questions' order. Problems with the
 * decision model are reported as `unavailable` or `failed` rather than thrown, so each caller
 * picks its own fallback.
 */
export type DecideResult<Q extends readonly DecisionQuestion[] = readonly DecisionQuestion[]> =
  | { status: 'decided'; inferenceId: string; answers: DecisionAnswersFor<Q> }
  | { status: 'unavailable' }
  | { status: 'failed'; error: Error };

/**
 * Quick decisions from a decision model, falling back to Agent Builder's fast model.
 */
export interface DecisionsStart {
  /** Asks one or more questions about the input in one call. */
  decide<const Q extends readonly DecisionQuestion[]>(
    params: DecideParams<Q>
  ): Promise<DecideResult<Q>>;
}
