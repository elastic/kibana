/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolCallback } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeUntilValid: jest.fn(),
}));

import { executeUntilValid } from '@kbn/inference-prompt-utils';
import { createCriteriaEvaluator, type EvaluationCriterion } from '.';

const executeUntilValidMock = executeUntilValid as jest.MockedFunction<typeof executeUntilValid>;

const inferenceClient = {} as BoundInferenceClient;
const log = { info: jest.fn() } as unknown as ToolingLog;

const criteria: EvaluationCriterion[] = [
  { id: 'pass-me', text: 'Must do the thing', score: 2 },
  { id: 'fail-me', text: 'Must report a signal', score: 3 },
  { id: 'na-me', text: 'Optional when inapplicable', score: 1 },
];

const callScore = async (callback: ToolCallback, arguments_: Record<string, unknown>) =>
  callback({
    toolCallId: 'call-score',
    function: { name: 'score', arguments: arguments_ },
  });

const mockScoreWith = (criteriaResults: unknown[]) => {
  const arguments_ = { criteria: criteriaResults };
  executeUntilValidMock.mockImplementation(async (options) => {
    await callScore(options.toolCallbacks.score as ToolCallback, arguments_);
    return {
      content: '',
      toolCalls: [{ function: { name: 'score', arguments: arguments_ } }],
    } as unknown as Awaited<ReturnType<typeof executeUntilValid>>;
  });
};

describe('createCriteriaEvaluator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const runEvaluation = () =>
    createCriteriaEvaluator({ inferenceClient, criteria, log }).evaluate({
      input: {},
      output: {},
      expected: {},
      metadata: null,
    });

  it('reports per-criterion id, result, reason, and weight in metadata', async () => {
    mockScoreWith([
      { id: 'pass-me', result: 'PASS', reason: 'Detected the thing' },
      { id: 'fail-me', result: 'FAIL', reason: 'No signal present' },
      { id: 'na-me', result: 'N/A', reason: 'Feature not applicable' },
    ]);

    const result = await runEvaluation();
    const metadata = result.metadata as Record<string, unknown>;

    expect(metadata).toMatchObject({
      successful: 2,
      failed: 3,
      not_applicable: 1,
    });
    expect(metadata.criteria).toEqual([
      { id: 'pass-me', result: 'PASS', reason: 'Detected the thing', weight: 2 },
      { id: 'fail-me', result: 'FAIL', reason: 'No signal present', weight: 3 },
      { id: 'na-me', result: 'N/A', reason: 'Feature not applicable', weight: 1 },
    ]);
    expect(result.score).toBeCloseTo((2 + 1) / 6, 5);
    expect(result.explanation).toBe(
      '"pass-me" (PASS): Detected the thing\n' +
        '"fail-me" (FAIL): No signal present\n' +
        '"na-me" (N/A): Feature not applicable'
    );
  });

  it('names the per-criterion verdict so a FAIL without a reason is not rendered like a PASS', async () => {
    mockScoreWith([
      { id: 'pass-me', result: 'PASS', reason: 'Grounded in the alert' },
      { id: 'fail-me', result: 'FAIL' },
      { id: 'na-me', result: 'N/A' },
    ]);

    const result = await runEvaluation();

    // The verdict is what separates a silent FAIL from a PASS; the reason stays the fallback text.
    expect(result.explanation).toContain('"pass-me" (PASS)');
    expect(result.explanation).toContain('"na-me" (N/A)');
    expect(result.explanation).toContain('"fail-me" (FAIL): No explanation given');
  });

  it('feeds the graded task output — including the analysed alert — to the judge prompt', async () => {
    // The alert-analysis suite attaches the alert it analysed to the task output; this is the
    // channel that carries it into the judge prompt (a FAIL on the "does not invent alert
    // fields…" criterion is only meaningful when the judge can see the alert data at all).
    mockScoreWith([
      { id: 'pass-me', result: 'PASS', reason: 'Grounded in the alert' },
      { id: 'fail-me', result: 'PASS', reason: 'Grounded in the alert' },
      { id: 'na-me', result: 'PASS', reason: 'Grounded in the alert' },
    ]);

    await createCriteriaEvaluator({ inferenceClient, criteria, log }).evaluate({
      input: { alertId: 'a1' },
      output: {
        classification: 'true_positive',
        rationale: 'update_flash.exe was dropped in the Downloads folder',
        alertData: { 'process.name': 'update_flash.exe', 'host.name': 'build-agent-03' },
      },
      expected: {},
      metadata: null,
    });

    const judged = executeUntilValidMock.mock.calls[0][0].input as Record<string, string>;
    expect(judged.input).toBe(JSON.stringify({ alertId: 'a1' }));
    expect(judged.output).toContain('"process.name":"update_flash.exe"');
    expect(judged.output).toContain('"host.name":"build-agent-03"');
    expect(judged.output).toContain('update_flash.exe was dropped in the Downloads folder');
  });

  it('keeps N/A at full weight and the aggregate label unchanged', async () => {
    mockScoreWith(
      [{ id: 'pass-me', result: 'PASS' }].concat([
        { id: 'fail-me', result: 'FAIL' },
        { id: 'na-me', result: 'N/A' },
      ])
    );

    const result = await runEvaluation();

    expect(result.score).toBeCloseTo((2 + 1) / 6, 5);
    expect((result.metadata as Record<string, unknown>).not_applicable).toBe(1);
  });

  it('scores a full PASS as 1 and a full FAIL as 0', async () => {
    mockScoreWith([
      { id: 'pass-me', result: 'PASS' },
      { id: 'fail-me', result: 'PASS' },
      { id: 'na-me', result: 'PASS' },
    ]);
    const passResult = await runEvaluation();
    expect(passResult.score).toBe(1);

    mockScoreWith([
      { id: 'pass-me', result: 'FAIL' },
      { id: 'fail-me', result: 'FAIL' },
      { id: 'na-me', result: 'FAIL' },
    ]);
    const failResult = await runEvaluation();
    expect(failResult.score).toBe(0);
  });

  it('throws when a configured criterion is missing from the judge response', async () => {
    mockScoreWith([
      { id: 'pass-me', result: 'PASS' },
      { id: 'na-me', result: 'N/A' },
    ]);

    await expect(runEvaluation()).rejects.toThrow('Missing scores for fail-me');
  });
});
