/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NonEmptyTuple } from 'type-fest';

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

/**
 * The answers to a list of questions, in the same order. Literal questions give a tuple typed by
 * position; a list built at runtime gives `[DecisionAnswer, ...DecisionAnswer[]]`.
 */
export type DecisionAnswersFor<Q extends readonly DecisionQuestion[]> = {
  -readonly [I in keyof Q]: DecisionAnswerFor<Q[I]>;
};

export interface DecideOptions {
  /** The text the decision model reads. */
  input: string;
  /** The `decision` inference endpoint to use. */
  inferenceId: string;
  abortSignal?: AbortSignal;
}

/**
 * Asks a decision model one or more bounded questions about an input, in one call: fast, cheap
 * answers with probabilities, in the questions' order. Throws an inference request error with
 * status 404 when the `decision` endpoint doesn't exist.
 * @experimental The Elasticsearch `decision` inference task it calls is experimental.
 */
export type DecideAPI = <const Q extends NonEmptyTuple<DecisionQuestion>>(
  options: DecideOptions,
  ...questions: Q
) => Promise<{ answers: DecisionAnswersFor<Q> }>;
