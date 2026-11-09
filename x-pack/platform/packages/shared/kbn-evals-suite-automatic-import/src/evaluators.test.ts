/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAutomaticImportEvaluators } from './evaluators';
import type { JudgeExtraFields } from './extra_field_judge';
import type { EcsFields } from './scoring/ecs_fields';
import { extraFieldKey } from './scoring/score_run';
import type { AutomaticImportRunOutput } from './types';

const ECS_FIELDS: EcsFields = new Map(
  ['event.category', 'event.outcome', 'user.name', 'source.ip'].map((name) => [name, {}])
);

const JUDGE_MODEL = { id: 'openai-gpt-5.4', family: 'gpt', provider: 'openai' };

const findEvaluator = (name: string, judgeExtraFields: JudgeExtraFields) => {
  const evaluator = createAutomaticImportEvaluators(ECS_FIELDS, {
    judgeExtraFields,
    getModel: () => JUDGE_MODEL,
  }).find((candidate) => candidate.name === name);
  if (!evaluator) {
    throw new Error(`No evaluator named ${name}`);
  }
  return evaluator;
};

const evaluate = async (
  name: string,
  output: AutomaticImportRunOutput,
  judgeExtraFields: JudgeExtraFields = async () => new Set()
) =>
  findEvaluator(name, judgeExtraFields).evaluate({
    input: { datasetId: 'vendor_a_signon', title: 'Vendor A', description: 'Logs', lines: ['x'] },
    output,
    expected: {
      samples: [
        {
          expected: {
            event: { category: ['authentication'], outcome: 'success' },
            user: { name: 'jdoe' },
          },
        },
      ],
    },
    metadata: { cohort: 'recent', format: 'json' },
  });

describe('createAutomaticImportEvaluators', () => {
  it('records the judge model only on the scores that use the judge', () => {
    const noJudge: JudgeExtraFields = async () => new Set();

    expect(findEvaluator('ECS F1', noJudge).getModel?.()).toEqual(JUDGE_MODEL);
    expect(findEvaluator('Categorization F1', noJudge).getModel?.()).toEqual(JUDGE_MODEL);
    expect(findEvaluator('ECS precision', noJudge).getModel?.()).toEqual(JUDGE_MODEL);
    expect(findEvaluator('ECS recall', noJudge).getModel).toBeUndefined();
    expect(findEvaluator('Run success', noJudge).getModel).toBeUndefined();
  });

  it('scores categorization on the event categorization fields only', async () => {
    const result = await evaluate('Categorization F1', {
      runId: 'vendor_a_1',
      status: 'completed',
      lines: [{ doc: { event: { category: ['authentication'], outcome: 'failure' } } }],
    });

    expect(result.score).toBe(0.5);
  });

  it('counts extra fields the judge marks correct toward precision', async () => {
    const output: AutomaticImportRunOutput = {
      runId: 'vendor_a_1',
      status: 'completed',
      lines: [
        {
          doc: {
            event: { category: ['authentication'], outcome: 'success' },
            user: { name: 'jdoe' },
            source: { ip: '81.2.69.142' },
          },
        },
      ],
    };

    const judgedCorrect = await evaluate(
      'ECS precision',
      output,
      async () => new Set([extraFieldKey(0, 'source.ip')])
    );
    const notJudgedCorrect = await evaluate('ECS precision', output);

    expect(judgedCorrect.score).toBe(1);
    expect(notJudgedCorrect.score).toBe(0.75);
  });

  it('leaves judged scores empty when the judge fails, without failing the others', async () => {
    const output: AutomaticImportRunOutput = {
      runId: 'vendor_a_1',
      status: 'completed',
      lines: [{ doc: { user: { name: 'jdoe' } } }],
    };
    const failingJudge: JudgeExtraFields = async () => {
      throw new Error('Every judge vote failed');
    };

    const precision = await evaluate('ECS precision', output, failingJudge);
    const recall = await evaluate('ECS recall', output, failingJudge);

    expect(precision).toMatchObject({ score: null, label: 'judge_failed' });
    expect(recall.score).toBeCloseTo(1 / 3);
  });

  it('fails a completed run whose pipeline maps no ECS fields', async () => {
    const result = await evaluate('Run success', {
      runId: 'vendor_a_1',
      status: 'completed',
      lines: [{ doc: { message: 'x', ecs: { version: '9.3.0' } } }],
    });

    expect(result).toMatchObject({ score: 0, label: 'no_ecs_fields' });
  });
});
