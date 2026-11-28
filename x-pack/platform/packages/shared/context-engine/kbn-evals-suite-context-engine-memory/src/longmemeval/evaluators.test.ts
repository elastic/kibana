/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  buildJudgePrompt,
  createEvidenceSessionRecallEvaluator,
  createLongMemEvalAnswerAccuracyEvaluator,
  createUsedEsqlEvaluator,
  selectJudgeBranch,
} from './evaluators';
import type { LongMemEvalExample, LongMemEvalMetadata } from './dataset';
import type { LongMemEvalTaskOutput } from './task';
import type { ToolEvidenceSummary } from './tool_evidence';

jest.mock('@kbn/evals', () => ({
  buildModelFromConnector: () => ({ id: 'judge-model', provider: 'openai', family: 'gpt' }),
}));

const log = { warning: jest.fn() } as unknown as ToolingLog;
const evaluationConnector = { id: 'judge-connector' } as EvalConnector;

const metadata = (overrides: Partial<LongMemEvalMetadata> = {}): LongMemEvalMetadata => ({
  externalId: 'q1',
  questionType: 'single-session-user',
  abstention: false,
  split: 'dev',
  evidenceSessionIds: ['session-0003'],
  sessionCount: 40,
  sourceRevision: 'rev',
  sourceSha256: 'sha',
  splitRevision: 'split',
  referenceJudgeRevision: 'judge',
  indexSchemaVersion: 'schema',
  promptVersion: 'prompt',
  armId: 'arm',
  suiteVersion: 'suite',
  ...overrides,
});

const toolEvidence = (retrievedSessionIds: string[]): ToolEvidenceSummary => ({
  toolCalls: [],
  toolCallCount: 1,
  dataToolCallCount: 1,
  overBudgetCount: 0,
  usedReadFile: false,
  usedEsql: true,
  readsPocIndex: true,
  otherIndices: [],
  retrievedSessionIds,
});

const okOutput: LongMemEvalTaskOutput = {
  finalResponse: 'Your bike is red.',
  taskStatus: 'ok',
  toolEvidence: toolEvidence(['session-0003']),
};

const params = (
  output: LongMemEvalTaskOutput,
  meta: LongMemEvalMetadata = metadata()
): {
  input: LongMemEvalExample['input'];
  output: LongMemEvalTaskOutput;
  expected: LongMemEvalExample['output'];
  metadata: LongMemEvalMetadata;
} => ({
  input: { question: 'What colour is my bike?', questionDate: '2023/05/30 (Tue) 20:36' },
  output,
  expected: { expected: 'Red' },
  metadata: meta,
});

const judgeReturning = (args: unknown) => ({
  chatComplete: jest.fn().mockResolvedValue({
    content: '',
    toolCalls: [{ toolCallId: '1', function: { name: 'longmemeval_judgement', arguments: args } }],
  }),
});

describe('selectJudgeBranch', () => {
  it.each([
    ['single-session-user', 'ordinary'],
    ['single-session-assistant', 'ordinary'],
    ['multi-session', 'ordinary'],
    ['temporal-reasoning', 'temporal'],
    ['knowledge-update', 'knowledge-update'],
    ['single-session-preference', 'preference'],
  ])('maps %s to the %s prompt', (questionType, branch) => {
    expect(selectJudgeBranch({ questionType, abstention: false })).toBe(branch);
  });

  it('uses the abstention prompt for abstention examples of any known type', () => {
    expect(selectJudgeBranch({ questionType: 'temporal-reasoning', abstention: true })).toBe(
      'abstention'
    );
  });

  it('rejects unknown types, including abstention examples', () => {
    expect(() => selectJudgeBranch({ questionType: 'other', abstention: false })).toThrow();
    expect(() => selectJudgeBranch({ questionType: 'other', abstention: true })).toThrow();
  });
});

describe('buildJudgePrompt', () => {
  it('fills the upstream slots in question, answer, response order', () => {
    // Upstream keeps a space before the first blank line ("answer no. \n\n"); keep it byte-exact.
    expect(
      buildJudgePrompt({ branch: 'ordinary', question: 'Q?', answer: 'A', response: 'R' })
    ).toBe(
      'I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no. \n\nQuestion: Q?\n\nCorrect Answer: A\n\nModel Response: R\n\nIs the model response correct? Answer yes or no only.'
    );
  });

  it('labels the expected value as a rubric for preference and an explanation for abstention', () => {
    const fill = { question: 'Q?', answer: 'A', response: 'R' };
    expect(buildJudgePrompt({ branch: 'preference', ...fill })).toContain('Rubric: A');
    expect(buildJudgePrompt({ branch: 'abstention', ...fill })).toContain('Explanation: A');
  });
});

describe('createLongMemEvalAnswerAccuracyEvaluator', () => {
  it('scores 1 and 0 from the forced tool call, using the judge connector model', async () => {
    const correct = judgeReturning({ correct: true });
    const evaluator = createLongMemEvalAnswerAccuracyEvaluator({
      inferenceClient: correct,
      evaluationConnector,
      log,
    });
    await expect(evaluator.evaluate(params(okOutput))).resolves.toMatchObject({
      score: 1,
      label: 'correct',
      metadata: { promptBranch: 'ordinary', judgeConnectorId: 'judge-connector', temperature: 0 },
    });
    expect(evaluator.getModel?.()).toEqual({
      id: 'judge-model',
      provider: 'openai',
      family: 'gpt',
    });
    expect(correct.chatComplete).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0, toolChoice: { function: 'longmemeval_judgement' } })
    );

    const incorrect = createLongMemEvalAnswerAccuracyEvaluator({
      inferenceClient: judgeReturning({ correct: false }),
      evaluationConnector,
      log,
    });
    await expect(incorrect.evaluate(params(okOutput))).resolves.toMatchObject({
      score: 0,
      label: 'incorrect',
    });
  });

  it('never sends history or evidence IDs to the judge', async () => {
    const judge = judgeReturning({ correct: true });
    const evaluator = createLongMemEvalAnswerAccuracyEvaluator({
      inferenceClient: judge,
      evaluationConnector,
      log,
    });
    await evaluator.evaluate(params(okOutput));
    expect(JSON.stringify(judge.chatComplete.mock.calls[0][0])).not.toContain('session-0003');
  });

  it('does not judge failed or empty task outputs', async () => {
    const judge = judgeReturning({ correct: true });
    const evaluator = createLongMemEvalAnswerAccuracyEvaluator({
      inferenceClient: judge,
      evaluationConnector,
      log,
    });
    const failed: LongMemEvalTaskOutput = {
      finalResponse: null,
      taskStatus: 'error',
      errorCode: 'agent_call_failed',
    };
    await expect(evaluator.evaluate(params(failed))).resolves.toMatchObject({
      score: null,
      label: 'error',
    });
    expect(judge.chatComplete).not.toHaveBeenCalled();
  });

  it('returns a null score for abstention/ID mismatches and malformed judge output', async () => {
    const mismatch = createLongMemEvalAnswerAccuracyEvaluator({
      inferenceClient: judgeReturning({ correct: true }),
      evaluationConnector,
      log,
    });
    await expect(
      mismatch.evaluate(params(okOutput, metadata({ externalId: 'q1_abs', abstention: false })))
    ).resolves.toMatchObject({ score: null, label: 'error' });

    const malformed = judgeReturning({ correct: 'yes' });
    const evaluator = createLongMemEvalAnswerAccuracyEvaluator({
      inferenceClient: malformed,
      evaluationConnector,
      log,
    });
    await expect(evaluator.evaluate(params(okOutput))).resolves.toMatchObject({
      score: null,
      label: 'error',
    });
    expect(malformed.chatComplete).toHaveBeenCalledTimes(3);
  });
});

describe('createEvidenceSessionRecallEvaluator', () => {
  it('reports the share of evidence sessions any tool returned', async () => {
    const evaluator = createEvidenceSessionRecallEvaluator();
    const meta = metadata({ evidenceSessionIds: ['session-0001', 'session-0002'] });
    await expect(
      evaluator.evaluate(
        params({ ...okOutput, toolEvidence: toolEvidence(['session-0002']) }, meta)
      )
    ).resolves.toEqual({ score: 0.5, label: '1/2' });
  });
});

describe('createUsedEsqlEvaluator', () => {
  it('reports whether an ES|QL tool was used, neutrally, and null without evidence', async () => {
    const evaluator = createUsedEsqlEvaluator();
    expect(evaluator.direction).toBe('neutral');
    await expect(evaluator.evaluate(params(okOutput))).resolves.toEqual({
      score: 1,
      label: 'true',
    });
    const noEsql = { ...toolEvidence([]), usedEsql: false };
    await expect(
      evaluator.evaluate(params({ ...okOutput, toolEvidence: noEsql }))
    ).resolves.toEqual({ score: 0, label: 'false' });
    await expect(
      evaluator.evaluate(params({ ...okOutput, toolEvidence: undefined }))
    ).resolves.toEqual({ score: null, label: 'unavailable' });
  });
});
