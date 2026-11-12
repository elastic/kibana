/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import {
  ANSWER_SCORES,
  answerJudgePrompt,
  judgePrompt,
  kiText,
  parseAnswerJudgement,
  parseJudgement,
  rankByOverlap,
  rankWithReranker,
  SCORES,
  scoreLine,
} from './judge';
import type { DumpedKi, EvalTarget } from './types';

const ki = (id: string, title: string, content = ''): DumpedKi => ({
  id,
  type: 'fact.preference',
  title,
  content,
});

const target: EvalTarget = {
  id: 'q1',
  dataset: 'longmemeval_s',
  category: 'single-session-user',
  question: 'What degree did I graduate with?',
  answer: 'Business Administration',
  askedAt: '2023-05-30T23:40:00.000Z',
};

describe('judge', () => {
  it('shows the judge the knowledge to find and each candidate with its id', () => {
    const prompt = judgePrompt(target, [ki('fact-1', 'Degree', 'The user has a BBA.')]);

    expect(prompt).toContain(
      'KNOWLEDGE TO FIND\nQuestion: What degree did I graduate with?\nExpected answer: Business Administration\nAsked on: 2023-05-30T23:40:00.000Z'
    );
    expect(prompt).toContain('id: fact-1\n[fact.preference] Degree\nThe user has a BBA.');
    expect(judgePrompt({ ...target, knowledge: 'The user has a BBA.' }, [])).toContain(
      'Statement: The user has a BBA.'
    );
    expect(judgePrompt(target, [])).toContain('STORED ITEMS (one per block)\n(none)');
  });

  it('reads the verdict from the first JSON object, keeping only ids it was shown', () => {
    expect(
      parseJudgement(
        'Sure:\n```json\n{"verdict": "covered", "item_ids": ["fact-1", "made-up"], "reason": "It says so."}\n```',
        ['fact-1']
      )
    ).toEqual({ verdict: 'covered', kiIds: ['fact-1'], reason: 'It says so.' });
    expect(parseJudgement('{"verdict": "partial"}', [])).toEqual({
      verdict: 'partial',
      kiIds: [],
      reason: '',
    });
  });

  it('marks an answer it cannot read as an error', () => {
    expect(parseJudgement('I think so.', []).verdict).toBe('error');
    expect(parseJudgement('{"verdict": covered}', []).verdict).toBe('error');
    expect(parseJudgement('{"verdict": "maybe"}', []).verdict).toBe('error');
  });

  it('scores covered as 1 and partial as 0.5, counting every verdict', () => {
    expect(scoreLine(['covered', 'partial', 'missing', 'error', 'covered'], SCORES)).toEqual({
      targets: 5,
      counts: { covered: 2, partial: 1, missing: 1, error: 1 },
      score: 0.5,
    });
    expect(scoreLine([], ANSWER_SCORES)).toEqual({
      targets: 0,
      counts: { correct: 0, partial: 0, incorrect: 0, error: 0 },
      score: 0,
    });
  });

  it("asks whether the agent's answer gives the reference answer, and reads the verdict", () => {
    const prompt = answerJudgePrompt(target, 'You studied Business Administration.');

    expect(prompt).toContain(
      'Question: What degree did I graduate with?\nReference answer: Business Administration\nAsked on: 2023-05-30T23:40:00.000Z'
    );
    expect(prompt).toContain("Assistant's answer: You studied Business Administration.");
    expect(answerJudgePrompt(target, '')).toContain("Assistant's answer: (no answer)");
    expect(parseAnswerJudgement('{"verdict": "correct", "reason": "Same degree."}')).toEqual({
      verdict: 'correct',
      reason: 'Same degree.',
    });
    expect(parseAnswerJudgement('{"verdict": "covered"}').verdict).toBe('error');
  });

  it('ranks KIs by the reranker, or by the words they share with the target', async () => {
    const kis = [ki('a', 'Likes sushi'), ki('b', 'Graduated in Business Administration')];
    const transport = {
      request: jest.fn().mockResolvedValue({
        rerank: [
          { index: 1, relevance_score: 3 },
          { index: 0, relevance_score: -2 },
        ],
      }),
    };

    await expect(
      rankWithReranker({ transport } as unknown as Client, 'rerank-id', 'degree', kis)
    ).resolves.toEqual([kis[1], kis[0]]);
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_inference/rerank/rerank-id',
      body: { query: 'degree', input: kis.map(kiText) },
    });
    expect(rankByOverlap('Business Administration degree', kis).map(({ id }) => id)).toEqual([
      'b',
      'a',
    ]);
  });
});
