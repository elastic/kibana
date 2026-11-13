/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface DecideOptions {
  /** The text the decision model reads. */
  input: string;
  /** The `decision` inference endpoint to use. Defaults to the first one the cluster lists. */
  inferenceId?: string;
  abortSignal?: AbortSignal;
}

/** A decision, with the inference endpoint that made it. */
export type DecideResponse<T> = { inferenceId: string } & T;

/**
 * Asks a decision model bounded questions about an input: fast, cheap answers with
 * probabilities. Throws an inference request error with status 404 when the cluster has no
 * usable `decision` endpoint.
 */
export interface DecideAPI {
  /** Asks one question about the input. */
  <const Q extends DecisionQuestion>(options: DecideOptions, question: Q): Promise<
    DecideResponse<{ answer: DecisionAnswerFor<Q> }>
  >;
  /** Asks several questions about the same input in one call; answers follow the questions' order. */
  <const Q extends [DecisionQuestion, DecisionQuestion, ...DecisionQuestion[]]>(
    options: DecideOptions,
    ...questions: Q
  ): Promise<DecideResponse<{ answers: DecisionAnswersFor<Q> }>>;
}
