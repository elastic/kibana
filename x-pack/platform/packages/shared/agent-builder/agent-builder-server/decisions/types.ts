/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

/** A question for a decision model, in the shape of the ES `decision` inference task. */
export type DecisionQuestion =
  | { type: 'predicate'; instructions: string }
  | { type: 'choice'; instructions: string; choices: Record<string, string> }
  | {
      type: 'score';
      instructions: string;
      levels: Array<{ label: string; description: string }>;
    };

/** A decision model's answer to one {@link DecisionQuestion}. */
export type DecisionAnswer =
  | { type: 'predicate'; probability: number }
  | {
      type: 'choice';
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    }
  | {
      type: 'score';
      score: number;
      confidence: number;
      probabilities: Record<string, number>;
    };

export interface DecideParams {
  /** The request whose user the decision model is called as. */
  request: KibanaRequest;
  /** The text the decision model reads. */
  input: string;
  /** The questions to answer, keyed by name. */
  questions: Record<string, DecisionQuestion>;
  /** Overrides the configured timeout. */
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

/**
 * Outcome of a decision. Problems with the decision model are reported as `unavailable` or
 * `failed` rather than thrown, so each caller picks its own fallback.
 */
export type DecideResult =
  | { status: 'decided'; answers: Record<string, DecisionAnswer>; inferenceId: string }
  | { status: 'unavailable' }
  | { status: 'failed'; error: Error };

/**
 * Decision models: fast, cheap answers to bounded questions.
 */
export interface DecisionsStart {
  /** Asks the cluster's decision model the given questions. */
  decide(params: DecideParams): Promise<DecideResult>;
}
