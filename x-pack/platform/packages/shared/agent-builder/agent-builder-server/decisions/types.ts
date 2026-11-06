/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';

export interface DecisionPredicateQuestion {
  type: 'predicate';
  instructions: string;
}

export interface DecisionChoiceQuestion {
  type: 'choice';
  instructions: string;
  choices: Record<string, string>;
}

export interface DecisionScoreQuestion {
  type: 'score';
  instructions: string;
  levels: Array<{ label: string; description: string }>;
}

/** A question for a decision model, in the shape of the ES `decision` inference task. */
export type DecisionQuestion =
  | DecisionPredicateQuestion
  | DecisionChoiceQuestion
  | DecisionScoreQuestion;

export interface DecisionPredicateAnswer {
  type: 'predicate';
  probability: number;
}

export interface DecisionChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface DecisionScoreAnswer {
  type: 'score';
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
}

/** A decision model's answer to one {@link DecisionQuestion}. */
export type DecisionAnswer = DecisionPredicateAnswer | DecisionChoiceAnswer | DecisionScoreAnswer;

/** The answer type for a question type. */
export type DecisionAnswerFor<Q extends DecisionQuestion> = Extract<
  DecisionAnswer,
  { type: Q['type'] }
>;

/** The answers to a list of questions, typed by position. */
export type DecisionAnswersFor<Q extends readonly DecisionQuestion[]> = {
  [I in keyof Q]: DecisionAnswerFor<Q[I]>;
};

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
 * Decision models: fast, cheap answers to bounded questions.
 */
export interface DecisionsStart {
  /** Asks the cluster's decision model one question about the input. */
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
