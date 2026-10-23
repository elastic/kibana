/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { ExtraFieldJudgeParams } from './extra_field_judge';
import { createExtraFieldJudge } from './extra_field_judge';
import type { EcsFields } from './scoring/ecs_fields';
import { extraFieldKey } from './scoring/score_run';

const ECS_FIELDS: EcsFields = new Map([
  ['user.name', { type: 'keyword', short: 'Short name or login of the user.' }],
  ['source.ip', { type: 'ip' }],
  ['event.provider', { type: 'keyword' }],
  ['event.outcome', { type: 'keyword' }],
]);

const JUDGE_MODEL = { id: 'openai-gpt-5.4', family: 'gpt', provider: 'openai' };

const params: ExtraFieldJudgeParams = {
  input: {
    datasetId: 'vendor_a_signon',
    title: 'Vendor A',
    description: 'Sign-on logs',
    lines: ['line one', 'line two'],
  },
  output: {
    runId: 'vendor_a_1',
    status: 'completed',
    lines: [
      { doc: { user: { name: 'jdoe' }, source: { ip: 'not-an-ip' }, event: { provider: 'UI' } } },
      { doc: { user: { name: 'asmith' }, event: { provider: 'UI' } } },
    ],
  },
  expected: { samples: [{ expected: {} }, { expected: {} }] },
};

const createJudge = (verdicts: Record<string, 'PASS' | 'FAIL'>) => {
  const evaluate = jest.fn(async (_example: Parameters<Evaluator['evaluate']>[0]) => ({
    metadata: {
      criteria: Object.entries(verdicts).map(([id, result]) => ({ id, result })),
    },
  }));
  const createCriteriaEvaluator = jest.fn<Evaluator, [EvaluationCriterion[]]>(() => ({
    name: 'criteria',
    kind: 'LLM',
    direction: 'maximize',
    evaluate,
    getModel: () => JUDGE_MODEL,
  }));
  const { judgeExtraFields, getModel } = createExtraFieldJudge(ECS_FIELDS, createCriteriaEvaluator);
  return { judge: judgeExtraFields, getModel, createCriteriaEvaluator, evaluate };
};

describe('createExtraFieldJudge', () => {
  it('asks the judge only about extras that are valid ECS and keeps the ones it passes', async () => {
    const { judge, createCriteriaEvaluator } = createJudge({
      'user.name': 'PASS',
      'event.provider': 'FAIL',
    });

    const correct = await judge(params);

    expect(createCriteriaEvaluator.mock.calls[0][0]).toEqual([
      expect.objectContaining({ id: 'user.name' }),
      expect.objectContaining({ id: 'event.provider' }),
    ]);
    expect(correct).toEqual(
      new Set([extraFieldKey(0, 'user.name'), extraFieldKey(1, 'user.name')])
    );
  });

  it('shows the judge every line of a value that repeats, not just the first', async () => {
    const { judge, evaluate } = createJudge({ 'user.name': 'PASS', 'event.provider': 'PASS' });

    await judge(params);

    const [[{ input, output }]] = evaluate.mock.calls;
    expect(output).toMatchObject({
      'event.provider': [
        { line: 1, value: 'UI' },
        { line: 2, value: 'UI' },
      ],
    });
    expect(input).toMatchObject({ lines: { 1: 'line one', 2: 'line two' } });
  });

  it('adds integration guidance to the criteria for fields judges disagree on', async () => {
    const { judge, createCriteriaEvaluator } = createJudge({ 'event.outcome': 'PASS' });

    await judge({
      ...params,
      output: {
        runId: 'vendor_a_2',
        status: 'completed',
        lines: [{ doc: { event: { outcome: 'success' } } }],
      },
      expected: { samples: [{ expected: {} }] },
    });

    expect(createCriteriaEvaluator.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        id: 'event.outcome',
        text: expect.stringContaining('FAIL it on purely informational events'),
      }),
    ]);
  });

  it('votes on a run once, even though each evaluator gets its own copy of the output', async () => {
    const { judge, evaluate } = createJudge({ 'user.name': 'PASS', 'event.provider': 'PASS' });

    await judge({ ...params, output: structuredClone(params.output) });
    await judge({ ...params, output: structuredClone(params.output) });

    expect(evaluate).toHaveBeenCalledTimes(3);
  });

  it('votes again for a different run', async () => {
    const { judge, evaluate } = createJudge({ 'user.name': 'PASS', 'event.provider': 'PASS' });

    await judge(params);
    await judge({ ...params, output: { ...params.output, runId: 'vendor_a_2' } });

    expect(evaluate).toHaveBeenCalledTimes(6);
  });

  it("reports the criteria evaluator's model as the judge model", () => {
    const { getModel } = createJudge({});

    expect(getModel()).toEqual(JUDGE_MODEL);
  });

  it('keeps a field only when most of the votes pass it', async () => {
    const { judge, evaluate } = createJudge({ 'user.name': 'PASS', 'event.provider': 'PASS' });
    const vote = (verdicts: Record<string, 'PASS' | 'FAIL'>) => ({
      metadata: { criteria: Object.entries(verdicts).map(([id, result]) => ({ id, result })) },
    });
    evaluate
      .mockResolvedValueOnce(vote({ 'user.name': 'PASS', 'event.provider': 'PASS' }))
      .mockResolvedValueOnce(vote({ 'user.name': 'FAIL', 'event.provider': 'FAIL' }))
      .mockResolvedValueOnce(vote({ 'user.name': 'PASS', 'event.provider': 'FAIL' }));

    const correct = await judge(params);

    expect(correct).toEqual(
      new Set([extraFieldKey(0, 'user.name'), extraFieldKey(1, 'user.name')])
    );
  });

  it('decides with the remaining votes when some fail', async () => {
    const { judge, evaluate } = createJudge({ 'user.name': 'PASS', 'event.provider': 'FAIL' });
    evaluate.mockRejectedValueOnce(new Error('connector unavailable'));

    const correct = await judge(params);

    expect(correct).toEqual(
      new Set([extraFieldKey(0, 'user.name'), extraFieldKey(1, 'user.name')])
    );
  });

  it('fails when every vote fails', async () => {
    const { judge, evaluate } = createJudge({});
    evaluate.mockRejectedValue(new Error('connector unavailable'));

    await expect(judge(params)).rejects.toThrow('Every judge vote failed');
  });
});
