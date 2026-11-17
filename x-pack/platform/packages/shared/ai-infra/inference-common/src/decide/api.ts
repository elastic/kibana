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

export interface DecisionPredicateAnswer {
  type: 'predicate';
  probability: number;
}

export interface DecisionChoiceQuestion {
  type: 'choice';
  instructions: string;
  choices: Record<string, string>;
}

export interface DecisionChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface DecisionScoreQuestion {
  type: 'score';
  instructions: string;
  levels: Array<{ label: string; description: string }>;
}

export interface DecisionScoreAnswer {
  type: 'score';
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
}

/** Fails to compile when a question's or answer's `type` doesn't match its key. */
type WithMatchingTypes<
  T extends { [K in keyof T]: { question: { type: K }; answer: { type: K } } }
> = T;

type DecisionTypes = WithMatchingTypes<{
  predicate: { question: DecisionPredicateQuestion; answer: DecisionPredicateAnswer };
  choice: { question: DecisionChoiceQuestion; answer: DecisionChoiceAnswer };
  score: { question: DecisionScoreQuestion; answer: DecisionScoreAnswer };
}>;

export type DecisionType = keyof DecisionTypes;

/** `DecisionQuestion<'choice'>` narrows the union to one type; `DecisionAnswer` works the same way. */
export type DecisionQuestion<T extends DecisionType = DecisionType> = DecisionTypes[T]['question'];

export type DecisionAnswer<T extends DecisionType = DecisionType> = DecisionTypes[T]['answer'];

export type DecisionAnswerFor<Q extends DecisionQuestion> = DecisionAnswer<Q['type']>;

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

export type DecideResponse<T> = { inferenceId: string } & T;

/**
 * Asks a decision model bounded questions about an input: fast, cheap answers with
 * probabilities. Throws an inference request error with status 404 when the cluster has no
 * usable `decision` endpoint.
 * @experimental The Elasticsearch `decision` inference task it calls is experimental.
 */
export interface DecideAPI {
  <const Q extends DecisionQuestion>(options: DecideOptions, question: Q): Promise<
    DecideResponse<{ answer: DecisionAnswerFor<Q> }>
  >;
  /** Asks several questions about the same input in one call; answers follow the questions' order. */
  <const Q extends [DecisionQuestion, DecisionQuestion, ...DecisionQuestion[]]>(
    options: DecideOptions,
    ...questions: Q
  ): Promise<DecideResponse<{ answers: DecisionAnswersFor<Q> }>>;
}
