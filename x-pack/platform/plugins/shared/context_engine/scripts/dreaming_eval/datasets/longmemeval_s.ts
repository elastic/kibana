/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LongMemEvalSConfig } from '../config';
import type { EvalConversation, EvalRound, EvalTarget } from '../types';
import { pickSamples } from './samples';

export const LONGMEMEVAL_S_DATASET = 'longmemeval_s';

/** A record of `longmemeval_s_cleaned.json`. */
export interface LongMemEvalRecord {
  question_id: string;
  question_type: string;
  question: string;
  question_date: string;
  answer: string | number;
  answer_session_ids: string[];
  haystack_dates: string[];
  haystack_session_ids: string[];
  haystack_sessions: Array<Array<{ role: string; content: string }>>;
}

/** Minutes between the rounds of one session; LongMemEval dates sessions, not turns. */
const ROUND_SPACING_MINUTES = 2;

/** Parses a LongMemEval date such as `2023/05/20 (Sat) 02:21`, taken as UTC. */
export const parseLongMemEvalDate = (value: string): string => {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})(?: \(\w+\))? (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error(`Unrecognized LongMemEval date '${value}'`);
  }
  const [, year, month, day, hour, minute] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  ).toISOString();
};

const isAbstention = ({ question_id: id }: LongMemEvalRecord): boolean => id.endsWith('_abs');

/** The samples to evaluate: each is a question and its haystack of sessions. */
export const selectQuestions = (
  records: LongMemEvalRecord[],
  options: LongMemEvalSConfig
): LongMemEvalRecord[] =>
  pickSamples(
    records.filter((record) => options.include_abstention || !isAbstention(record)),
    records,
    ({ question_id: id }) => id,
    options,
    LONGMEMEVAL_S_DATASET
  );

/** Splits a session into rounds: each user message with the assistant messages that answer it. */
export const sessionToRounds = (
  turns: LongMemEvalRecord['haystack_sessions'][number],
  startedAt: string
): EvalRound[] => {
  const rounds: EvalRound[] = [];
  for (const { role, content } of turns) {
    if (role === 'user') {
      rounds.push({
        startedAt: new Date(
          Date.parse(startedAt) + rounds.length * ROUND_SPACING_MINUTES * 60_000
        ).toISOString(),
        user: content,
        steps: [],
        answer: '',
      });
    } else if (role === 'assistant' && rounds.length > 0) {
      const round = rounds[rounds.length - 1];
      round.answer = round.answer ? `${round.answer}\n\n${content}` : content;
    }
  }
  return rounds;
};

/**
 * The sessions of the selected samples, each once, in time order: their whole haystacks, or with
 * `sessions: answers` the sessions that hold an answer and `distractor_sessions` more per sample.
 */
export const selectConversations = (
  questions: LongMemEvalRecord[],
  { sessions: mode, distractor_sessions: distractors }: LongMemEvalSConfig
): EvalConversation[] => {
  const sessions = new Map<string, { startedAt: string; conversation: EvalConversation }>();
  for (const question of questions) {
    const answers = new Set(question.answer_session_ids);
    let addedDistractors = 0;
    question.haystack_session_ids.forEach((sessionId, index) => {
      const isAnswer = answers.has(sessionId);
      if (mode === 'answers' && !isAnswer && addedDistractors >= distractors) {
        return;
      }
      if (!isAnswer) {
        addedDistractors++;
      }
      if (sessions.has(sessionId)) {
        return;
      }
      const startedAt = parseLongMemEvalDate(question.haystack_dates[index]);
      const rounds = sessionToRounds(question.haystack_sessions[index], startedAt);
      if (rounds.length > 0) {
        sessions.set(sessionId, {
          startedAt,
          conversation: { id: sessionId, title: `Chat on ${startedAt.slice(0, 10)}`, rounds },
        });
      }
    });
  }
  return [...sessions.values()]
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .map(({ conversation }) => conversation);
};

export const targetsOf = (questions: LongMemEvalRecord[]): EvalTarget[] =>
  questions.map((question) => ({
    id: question.question_id,
    dataset: LONGMEMEVAL_S_DATASET,
    category: question.question_type,
    question: question.question,
    answer: String(question.answer),
    askedAt: parseLongMemEvalDate(question.question_date),
    evidence: question.answer_session_ids,
  }));
