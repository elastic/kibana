/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { calculateGroundednessScore } from './scoring';
import type { GroundednessAnalysis } from './types';

const NON_FACTUAL_VERDICT = 'NON_FACTUAL';

const systemPrompt = readFileSync(join(__dirname, 'system_prompt.text'), 'utf8');

interface ProceduralClaimTranscript {
  user_query: string;
  tool_call_history: unknown[];
  agent_response: string;
  judge_reply: GroundednessAnalysis;
  judge_reply_charging_procedural_text: GroundednessAnalysis;
}

const transcript: ProceduralClaimTranscript = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'procedural_claim_transcript.json'), 'utf8')
);

const isNonFactual = (claim: { verdict?: string }) => claim.verdict === NON_FACTUAL_VERDICT;

const scoreOf = (
  verdict: GroundednessAnalysis['analysis'][number]['verdict'],
  centrality: 'central' | 'peripheral'
) =>
  calculateGroundednessScore({
    summary_verdict: 'GROUNDED',
    analysis: [
      {
        claim: 'single claim',
        centrality,
        centrality_reason: '',
        verdict,
        evidence: undefined,
        explanation: '',
      },
    ],
  });

describe('groundedness claim scope', () => {
  describe('system prompt', () => {
    it('scopes claim extraction to assertions about the environment', () => {
      expect(systemPrompt).toMatch(/claims about the environment/i);
      expect(systemPrompt).toMatch(/sentences a tool `result` could confirm or contradict/i);
    });

    it('names the agent-own sentence shapes that must not be extracted as claims', () => {
      expect(systemPrompt).toMatch(
        /Do NOT extract the agent's own procedural, meta or forward-looking/i
      );
      expect(systemPrompt).toMatch(/Its own choices, parameter values and defaults/i);
      expect(systemPrompt).toMatch(/Its own plan, or narration of what it is doing/i);
      expect(systemPrompt).toMatch(/Offers and next steps for the user/i);
      expect(systemPrompt).toMatch(/Statements about its own access or capability/i);
      expect(systemPrompt).toMatch(/speculative explanation of why the data looks/i);
    });

    it('sends a non-claim that is extracted anyway to NON_FACTUAL, which carries no score weight', () => {
      expect(systemPrompt).toMatch(/NON_FACTUAL/);
      expect(systemPrompt).toMatch(/carries no groundedness weight/i);
      expect(systemPrompt).toMatch(/must not change the score or the `summary_verdict`/i);
    });

    it('keeps the hallucination verdicts and their penalties as they were', () => {
      expect(systemPrompt).toMatch(/`CONTRADICTED`: The claim is explicitly contradicted/);
      expect(systemPrompt).toMatch(/`NOT_FOUND` \(Hallucination\)/);
      expect(systemPrompt).toMatch(/`PARTIALLY_SUPPORTED`: The claim's core fact is verifiable/);
      expect(systemPrompt).toMatch(/`UNGROUNDED_BUT_DISCLOSED`/);
    });
  });

  describe('scoring', () => {
    it('keeps the score at 1 when the only unsupported sentences are the agent`s own procedural text', () => {
      const nonFactual = transcript.judge_reply.analysis.filter(isNonFactual);
      expect(nonFactual).toHaveLength(2);
      expect(calculateGroundednessScore(transcript.judge_reply)).toBe(1);
    });

    it('does not read an all-NON_FACTUAL answer as an ungrounded one', () => {
      const onlyProceduralText: GroundednessAnalysis = {
        summary_verdict: 'GROUNDED',
        analysis: transcript.judge_reply.analysis.filter(isNonFactual),
      };
      expect(calculateGroundednessScore(onlyProceduralText)).toBe(1);
    });

    it('still charges a claim the judge gave an unsupported verdict, at the unchanged weight', () => {
      const score = calculateGroundednessScore(transcript.judge_reply_charging_procedural_text);
      expect(score).toBeLessThan(1);
      // unchanged PARTIALLY_SUPPORTED peripheral weight: sqrt(1.0 * 0.95)
      expect(score).toBeCloseTo(Math.sqrt(0.95), 10);
    });

    it('leaves every verdict weight untouched', () => {
      expect(scoreOf('CONTRADICTED', 'central')).toBe(0);
      expect(scoreOf('CONTRADICTED', 'peripheral')).toBeCloseTo(0.1);
      expect(scoreOf('NOT_FOUND', 'central')).toBeCloseTo(0.1);
      expect(scoreOf('NOT_FOUND', 'peripheral')).toBeCloseTo(0.5);
      expect(scoreOf('PARTIALLY_SUPPORTED', 'central')).toBeCloseTo(0.9);
      expect(scoreOf('PARTIALLY_SUPPORTED', 'peripheral')).toBeCloseTo(0.95);
      expect(scoreOf('UNGROUNDED_BUT_DISCLOSED', 'central')).toBeCloseTo(0.75);
      expect(scoreOf('FULLY_SUPPORTED', 'central')).toBe(1);
    });

    it('still reports an absent claim analysis as the empty-analysis fallback', () => {
      expect(calculateGroundednessScore({ summary_verdict: 'GROUNDED', analysis: [] })).toBe(0);
    });
  });
});
