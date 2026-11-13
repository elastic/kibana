/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  DecisionAnswerFor,
  DecisionAnswersFor,
  DecisionQuestion,
} from '@kbn/inference-common';

export interface DecideParams {
  /** The request whose user the decision model is called as. */
  request: KibanaRequest;
  /** The text the decision model reads. */
  input: string;
  abortSignal?: AbortSignal;
}

/**
 * Outcome of a decision. Problems with the decision model are reported as `unavailable` or
 * `failed` rather than thrown, so each caller picks its own fallback.
 */
export type DecideResult<T> =
  | ({ status: 'decided'; inferenceId: string } & T)
  | { status: 'unavailable' }
  | { status: 'failed'; error: Error };

/**
 * Quick decisions from a decision model, falling back to Agent Builder's fast model.
 */
export interface DecisionsStart {
  /** Asks one question about the input. */
  decide<const Q extends DecisionQuestion>(
    params: DecideParams,
    question: Q
  ): Promise<DecideResult<{ answer: DecisionAnswerFor<Q> }>>;
  /** Asks several questions about the same input in one call; answers follow the questions' order. */
  decide<const Q extends [DecisionQuestion, DecisionQuestion, ...DecisionQuestion[]]>(
    params: DecideParams,
    ...questions: Q
  ): Promise<DecideResult<{ answers: DecisionAnswersFor<Q> }>>;
}
