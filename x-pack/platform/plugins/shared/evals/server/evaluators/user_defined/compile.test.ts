/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvidenceRound } from '../evidence/types';
import type { TraceAccessor } from '../types';
import { compileUserDefinedEvaluator } from './compile';
import type { EvaluatorDefinitionDocument, LlmJudgeConfig } from './types';

const NUMERIC_JUDGE: LlmJudgeConfig = {
  prompt: 'Question: {{{user_query}}}\nAnswer: {{{agent_response}}}\nRate the tone.',
  system_prompt: 'Judge the response according to the supplied criteria.',
  evidence: ['input', 'response'],
  output: { scores: [{ name: 'tone', type: 'number', description: '1 is professional.' }] },
};

const document = (judge: LlmJudgeConfig): EvaluatorDefinitionDocument => ({
  id: 'stored-id',
  name: 'tone',
  version: '2.1.0',
  kind: 'llm',
  description: 'Judges tone',
  judge,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const round = (overrides: Partial<EvidenceRound> = {}): EvidenceRound => ({
  input: { message: 'Is the payment service healthy?' },
  response: { message: 'Yes, it is healthy.' },
  steps: [],
  ...overrides,
});

const runJudge = async ({
  judge,
  output,
  referenceData,
  evidenceRound = round(),
}: {
  judge: LlmJudgeConfig;
  output: unknown;
  referenceData?: Record<string, unknown>;
  evidenceRound?: EvidenceRound;
}) => {
  const prompt = jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: output } }] });
  const definition = compileUserDefinedEvaluator(document(judge));

  const result = await definition.evaluate({
    trace: {} as TraceAccessor,
    round: evidenceRound,
    referenceData,
    inferenceClient: { prompt } as unknown as BoundInferenceClient,
    log: loggingSystemMock.createLogger(),
  });

  return { result, prompt };
};

describe('compileUserDefinedEvaluator', () => {
  it('presents the stored definition as a user-defined evaluator', () => {
    const definition = compileUserDefinedEvaluator(document(NUMERIC_JUDGE));

    expect(definition).toEqual(
      expect.objectContaining({
        name: 'tone',
        version: '2.1.0',
        kind: 'llm',
        origin: 'user_defined',
        description: 'Judges tone',
        direction: 'maximize',
      })
    );
  });

  describe('evidence schema', () => {
    it('requires the evidence the judge declared', () => {
      const { evidenceSchema } = compileUserDefinedEvaluator(document(NUMERIC_JUDGE));

      expect(evidenceSchema!.safeParse(round()).success).toBe(true);
      expect(evidenceSchema!.safeParse({ input: { message: 'Hi' } }).success).toBe(false);
    });

    it('rejects a blank message, which would leave the judge nothing to grade', () => {
      const { evidenceSchema } = compileUserDefinedEvaluator(document(NUMERIC_JUDGE));

      expect(
        evidenceSchema!.safeParse({ input: { message: 'Hi' }, response: { message: '  ' } }).success
      ).toBe(false);
    });

    it('ignores evidence the judge did not declare', () => {
      const { evidenceSchema } = compileUserDefinedEvaluator(
        document({ ...NUMERIC_JUDGE, evidence: ['response'] })
      );

      expect(evidenceSchema!.safeParse({ response: { message: 'Yes.' } }).success).toBe(true);
    });

    it('requires at least one tool call when steps are declared', () => {
      const { evidenceSchema } = compileUserDefinedEvaluator(
        document({ ...NUMERIC_JUDGE, evidence: ['steps'] })
      );

      expect(evidenceSchema!.safeParse({ steps: [{ tool_id: 'search' }] }).success).toBe(true);
      expect(evidenceSchema!.safeParse({ steps: [] }).success).toBe(false);
    });

    it('is absent when the judge declares no evidence', () => {
      const { evidenceSchema } = compileUserDefinedEvaluator(
        document({ ...NUMERIC_JUDGE, prompt: 'Rate anything.', evidence: [] })
      );

      expect(evidenceSchema).toBeUndefined();
    });
  });

  describe('reference data schema', () => {
    const withKeys = document({ ...NUMERIC_JUDGE, reference_data_keys: ['expected'] });

    it('requires each declared key as a non-empty string', () => {
      const { referenceDataSchema } = compileUserDefinedEvaluator(withKeys);

      expect(referenceDataSchema!.safeParse({ expected: 'Yes.' }).success).toBe(true);
      expect(referenceDataSchema!.safeParse({}).success).toBe(false);
      expect(referenceDataSchema!.safeParse({ expected: '  ' }).success).toBe(false);
    });

    it('is absent when the judge declares no reference data', () => {
      const { referenceDataSchema } = compileUserDefinedEvaluator(document(NUMERIC_JUDGE));

      expect(referenceDataSchema).toBeUndefined();
    });
  });

  describe('prompt', () => {
    it('passes the declared evidence under the variable names the template uses', async () => {
      const { prompt } = await runJudge({
        judge: {
          ...NUMERIC_JUDGE,
          evidence: ['input', 'response', 'steps'],
          prompt: '{{{user_query}}} {{{agent_response}}} {{{tool_calls}}}',
        },
        evidenceRound: round({ steps: [{ tool_id: 'search' }] }),
        output: { tone: { score: 1, explanation: 'Professional.' } },
      });

      expect(prompt.mock.calls[0][0]?.input).toEqual({
        user_query: 'Is the payment service healthy?',
        agent_response: 'Yes, it is healthy.',
        tool_calls: JSON.stringify([{ tool_id: 'search' }]),
      });
    });

    it('passes reference data under each declared key', async () => {
      const { prompt } = await runJudge({
        judge: {
          ...NUMERIC_JUDGE,
          reference_data_keys: ['expected'],
          prompt: '{{{agent_response}}} vs {{{expected}}}',
        },
        referenceData: { expected: 'It is healthy.' },
        output: { tone: { score: 1, explanation: 'Professional.' } },
      });

      expect(prompt.mock.calls[0][0]?.input).toEqual(
        expect.objectContaining({ expected: 'It is healthy.' })
      );
    });

    it('withholds evidence the judge did not declare', async () => {
      const { prompt } = await runJudge({
        judge: { ...NUMERIC_JUDGE, evidence: ['response'], prompt: '{{{agent_response}}}' },
        output: { tone: { score: 1, explanation: 'Professional.' } },
      });

      expect(prompt.mock.calls[0][0]?.input).toEqual({ agent_response: 'Yes, it is healthy.' });
    });

    it('asks the model for one tool property per declared score', async () => {
      const { prompt } = await runJudge({
        judge: {
          ...NUMERIC_JUDGE,
          output: {
            scores: [
              { name: 'tone', type: 'number' },
              {
                name: 'verdict',
                type: 'categorical',
                labels: [
                  { value: 'pass', score: 1 },
                  { value: 'fail', score: 0 },
                ],
              },
            ],
          },
        },
        output: {
          tone: { score: 1, explanation: 'Professional.' },
          verdict: { label: 'pass', explanation: 'Answers the question.' },
        },
      });

      const { schema } = prompt.mock.calls[0][0].prompt.versions[0].tools.evaluate;

      expect(schema.required).toEqual(['tone', 'verdict']);
      expect(schema.properties.tone.properties.score).toEqual(
        expect.objectContaining({ type: 'number' })
      );
      expect(schema.properties.verdict.properties.label).toEqual(
        expect.objectContaining({ type: 'string', enum: ['pass', 'fail'] })
      );
    });

    it('uses the system prompt the definition set', async () => {
      const { prompt } = await runJudge({
        judge: { ...NUMERIC_JUDGE, system_prompt: 'You grade tone and nothing else.' },
        output: { tone: { score: 1, explanation: 'Professional.' } },
      });

      expect(prompt.mock.calls[0][0].prompt.versions[0].system).toEqual({
        mustache: { template: 'You grade tone and nothing else.' },
      });
    });
  });

  describe('judge output', () => {
    it('reports a numeric score with its explanation', async () => {
      const { result } = await runJudge({
        judge: NUMERIC_JUDGE,
        output: { tone: { score: 0.8, explanation: 'Mostly professional.' } },
      });

      expect(result.scores).toEqual([
        expect.objectContaining({
          name: 'tone',
          score: 0.8,
          explanation: 'Mostly professional.',
        }),
      ]);
    });

    it('rejects a numeric score outside 0..1', async () => {
      await expect(
        runJudge({
          judge: NUMERIC_JUDGE,
          output: { tone: { score: 4, explanation: 'Very professional.' } },
        })
      ).rejects.toThrow('Judge returned an out-of-range score for "tone"');
    });

    it('converts a categorical label to the score its definition gives it', async () => {
      const { result } = await runJudge({
        judge: {
          ...NUMERIC_JUDGE,
          output: {
            scores: [
              {
                name: 'verdict',
                type: 'categorical',
                labels: [
                  { value: 'pass', score: 1 },
                  { value: 'partial', score: 0.5 },
                  { value: 'fail', score: 0 },
                ],
              },
            ],
          },
        },
        output: { verdict: { label: 'partial', explanation: 'Half right.' } },
      });

      expect(result.scores).toEqual([
        expect.objectContaining({ name: 'verdict', label: 'partial', score: 0.5 }),
      ]);
    });

    it('rejects a label outside the declared categories', async () => {
      await expect(
        runJudge({
          judge: {
            ...NUMERIC_JUDGE,
            output: {
              scores: [
                { name: 'verdict', type: 'categorical', labels: [{ value: 'pass', score: 1 }] },
              ],
            },
          },
          output: { verdict: { label: 'maybe', explanation: 'Unsure.' } },
        })
      ).rejects.toThrow('Judge returned unknown label "maybe" for "verdict"');
    });

    it('fails rather than reporting a score the judge left out', async () => {
      await expect(
        runJudge({ judge: NUMERIC_JUDGE, output: { other: { score: 1 } } })
      ).rejects.toThrow('Judge returned no result for "tone"');
    });

    it('fails when a numeric score comes back as something else', async () => {
      await expect(
        runJudge({ judge: NUMERIC_JUDGE, output: { tone: { score: 'high' } } })
      ).rejects.toThrow('Judge returned no numeric score for "tone"');
    });

    it('fails when the judge omits the required explanation', async () => {
      await expect(
        runJudge({ judge: NUMERIC_JUDGE, output: { tone: { score: 0.8 } } })
      ).rejects.toThrow('Judge returned no explanation for "tone"');
    });
  });

  it('refuses to run without an inference client', async () => {
    const definition = compileUserDefinedEvaluator(document(NUMERIC_JUDGE));

    await expect(
      definition.evaluate({
        trace: {} as TraceAccessor,
        round: round(),
        log: loggingSystemMock.createLogger(),
      })
    ).rejects.toThrow('Inference client is required for evaluator "tone"');
  });
});
