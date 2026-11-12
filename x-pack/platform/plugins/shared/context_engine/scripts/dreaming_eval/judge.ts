/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { z } from '@kbn/zod/v4';
import type { DumpedKi, EvalTarget } from './types';

export const VERDICTS = ['covered', 'partial', 'missing'] as const;
export type Verdict = (typeof VERDICTS)[number] | 'error';

export interface Judgement {
  verdict: Verdict;
  kiIds: string[];
  reason: string;
}

/** Characters of a KI the reranker and the judge see. */
const KI_TEXT_CHARS = 1500;
/** KIs ranked per rerank request. */
const RERANK_BATCH = 100;

export const SYSTEM_PROMPT =
  'You grade a long-term memory store that a memory system built from past conversations. You decide whether the store holds a given piece of knowledge, and answer with JSON only.';

export const kiText = ({ type, title, description, content }: DumpedKi): string => {
  const text = [`[${type}] ${title ?? ''}`.trim(), description, content]
    .filter((part) => part && part.trim())
    .join('\n');
  return text.length > KI_TEXT_CHARS ? `${text.slice(0, KI_TEXT_CHARS)} […]` : text;
};

export const targetQuery = ({ question, answer, knowledge }: EvalTarget): string =>
  [knowledge, question, `Answer: ${answer}`].filter(Boolean).join('\n');

const words = (text: string): Set<string> =>
  new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);

/** Ranks KIs by the words they share with the target, when no reranker is available. */
export const rankByOverlap = (query: string, kis: DumpedKi[]): DumpedKi[] => {
  const queryWords = words(query);
  return kis
    .map((ki) => ({
      ki,
      score: [...words(kiText(ki))].filter((word) => queryWords.has(word)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ ki }) => ki);
};

/** Ranks KIs with an Elasticsearch rerank inference endpoint. */
export const rankWithReranker = async (
  esClient: Client,
  inferenceId: string,
  query: string,
  kis: DumpedKi[]
): Promise<DumpedKi[]> => {
  const scored: Array<{ ki: DumpedKi; score: number }> = [];
  for (let start = 0; start < kis.length; start += RERANK_BATCH) {
    const batch = kis.slice(start, start + RERANK_BATCH);
    const response = await esClient.transport.request<{
      rerank: Array<{ index: number; relevance_score: number }>;
    }>({
      method: 'POST',
      path: `/_inference/rerank/${encodeURIComponent(inferenceId)}`,
      body: { query, input: batch.map(kiText) },
    });
    for (const { index, relevance_score: score } of response.rerank) {
      scored.push({ ki: batch[index], score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).map(({ ki }) => ki);
};

export const judgePrompt = (target: EvalTarget, candidates: DumpedKi[]): string => {
  const knowledge = [
    'KNOWLEDGE TO FIND',
    ...(target.knowledge ? [`Statement: ${target.knowledge}`] : []),
    `Question: ${target.question}`,
    `Expected answer: ${target.answer}`,
    ...(target.askedAt ? [`Asked on: ${target.askedAt}`] : []),
  ];
  const items = [
    'STORED ITEMS (one per block)',
    candidates.length === 0
      ? '(none)'
      : candidates.map((ki) => `id: ${ki.id}\n${kiText(ki)}`).join('\n---\n'),
  ];
  const task = [
    'Do the stored items, alone or together, hold what someone needs to give the expected answer to the question, without seeing the conversations?',
    '- covered: they state it; a paraphrase counts, and so does what the answer can be worked out from, such as dates for a question about how long ago.',
    '- partial: they hold part of it, or an older, vaguer or less certain version.',
    '- missing: they do not.',
    'Reply with JSON only: {"verdict": "covered" | "partial" | "missing", "item_ids": [ids of the items that hold it], "reason": "one sentence"}',
  ];
  return [knowledge, items, task].map((lines) => lines.join('\n')).join('\n\n');
};

const judgementSchema = z.object({
  verdict: z.enum(VERDICTS),
  item_ids: z.array(z.string()).default([]),
  reason: z.string().default(''),
});

/** Reads the judge's answer: the first JSON object in it, whatever surrounds it. */
export const parseJudgement = (content: string, candidateIds: string[]): Judgement => {
  const json = /\{[\s\S]*\}/.exec(content)?.[0];
  if (!json) {
    return { verdict: 'error', kiIds: [], reason: `No JSON in the judge's answer: ${content}` };
  }
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { verdict: 'error', kiIds: [], reason: `Invalid JSON from the judge: ${json}` };
  }
  const parsed = judgementSchema.safeParse(value);
  if (!parsed.success) {
    return { verdict: 'error', kiIds: [], reason: `Unexpected judge answer: ${json}` };
  }
  const known = new Set(candidateIds);
  return {
    verdict: parsed.data.verdict,
    kiIds: parsed.data.item_ids.filter((id) => known.has(id)),
    reason: parsed.data.reason,
  };
};

export const SCORES: Record<Verdict, number> = { covered: 1, partial: 0.5, missing: 0, error: 0 };

export interface ScoreLine {
  targets: number;
  covered: number;
  partial: number;
  missing: number;
  errors: number;
  /** Covered counts 1 and partial 0.5, over all targets. */
  score: number;
}

export const scoreLine = (verdicts: Verdict[]): ScoreLine => {
  const count = (verdict: Verdict) => verdicts.filter((v) => v === verdict).length;
  return {
    targets: verdicts.length,
    covered: count('covered'),
    partial: count('partial'),
    missing: count('missing'),
    errors: count('error'),
    score:
      verdicts.length === 0
        ? 0
        : verdicts.reduce((sum, verdict) => sum + SCORES[verdict], 0) / verdicts.length,
  };
};
