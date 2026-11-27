/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LongMemEvalSConfig } from '../config';
import type { EvalConversation, EvalRound, EvalTarget } from '../types';
import { pickSamples, pickSamplesFromStream } from './samples';

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

/** The same, reading the records as a stream, keeping only the selected ones. */
export const selectQuestionsFromStream = (
  records: AsyncIterable<LongMemEvalRecord>,
  options: LongMemEvalSConfig
): Promise<LongMemEvalRecord[]> =>
  pickSamplesFromStream(
    records,
    (record) => options.include_abstention || !isAbstention(record),
    ({ question_id: id }) => id,
    options,
    LONGMEMEVAL_S_DATASET
  );

const VARIANT_FILES: Record<LongMemEvalSConfig['variant'], string> = {
  s: 'longmemeval_s_cleaned.json',
  m: 'longmemeval_m_cleaned.json',
  oracle: 'longmemeval_oracle.json',
};

const DATA_URL = 'https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main';

/** The file of a LongMemEval variant, and where it is downloaded from unless `url` says. */
export const variantFileOf = ({
  variant,
  url,
}: Pick<LongMemEvalSConfig, 'variant' | 'url'>): { name: string; url: string } => ({
  name: VARIANT_FILES[variant],
  url: url ?? `${DATA_URL}/${VARIANT_FILES[variant]}`,
});

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
 * The indexes in its haystack of the sessions a sample imports: every one, or with
 * `sessions: answers` those that hold the answer and the first `distractor_sessions` others.
 */
const sessionIndexesOf = (
  question: LongMemEvalRecord,
  { sessions: mode, distractor_sessions: distractors }: LongMemEvalSConfig
): number[] => {
  const answers = new Set(question.answer_session_ids);
  let addedDistractors = 0;
  return question.haystack_session_ids.flatMap((sessionId, index) => {
    if (answers.has(sessionId)) {
      return [index];
    }
    if (mode === 'answers' && addedDistractors >= distractors) {
      return [];
    }
    addedDistractors++;
    return [index];
  });
};

/**
 * The sessions of the selected samples, each once and in time order, and the sessions of each
 * sample. Sessions without a user message are left out.
 */
export const selectConversations = (
  questions: LongMemEvalRecord[],
  options: LongMemEvalSConfig
): { conversations: EvalConversation[]; sampleConversations: Record<string, string[]> } => {
  const sessions = new Map<string, { startedAt: string; conversation: EvalConversation }>();
  const sampleConversations: Record<string, string[]> = {};
  for (const question of questions) {
    const ids: string[] = [];
    for (const index of sessionIndexesOf(question, options)) {
      const sessionId = question.haystack_session_ids[index];
      if (!sessions.has(sessionId)) {
        const startedAt = parseLongMemEvalDate(question.haystack_dates[index]);
        const rounds = sessionToRounds(question.haystack_sessions[index], startedAt);
        if (rounds.length === 0) {
          continue;
        }
        sessions.set(sessionId, {
          startedAt,
          conversation: { id: sessionId, title: `Chat on ${startedAt.slice(0, 10)}`, rounds },
        });
      }
      ids.push(sessionId);
    }
    sampleConversations[question.question_id] = ids;
  }
  return {
    conversations: [...sessions.values()]
      .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
      .map(({ conversation }) => conversation),
    sampleConversations,
  };
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
