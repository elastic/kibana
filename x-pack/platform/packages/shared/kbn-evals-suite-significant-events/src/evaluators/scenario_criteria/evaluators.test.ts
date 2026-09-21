/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from './evaluators';

const criteria: EvaluationCriterion[] = [{ id: 'c1', text: 'Should do the thing', score: 1 }];

const createJudge = () => {
  const evaluate = jest.fn(async () => ({ score: 0.5, explanation: 'judged' }));
  const criteriaFn = jest.fn(
    () =>
      ({
        name: 'criteria',
        kind: 'LLM',
        direction: 'maximize',
        evaluate,
      } as Evaluator)
  );
  return { criteriaFn, evaluate };
};

const run = (
  overrides: Partial<Parameters<typeof createScenarioCriteriaLlmEvaluator>[0]>,
  output: unknown
) => {
  const { criteriaFn, evaluate } = createJudge();
  const evaluator = createScenarioCriteriaLlmEvaluator({ criteriaFn, criteria, ...overrides });
  return {
    result: evaluator.evaluate({
      input: {},
      output: output as Parameters<typeof evaluator.evaluate>[0]['output'],
      expected: {},
      metadata: null,
    }),
    criteriaFn,
    judgeEvaluate: evaluate,
  };
};

describe('createScenarioCriteriaLlmEvaluator', () => {
  it('delegates to the judge when there is something to score', async () => {
    const { result, judgeEvaluate } = run({}, { queries: [{ esql: 'FROM logs' }] });

    expect((await result).score).toBe(0.5);
    expect(judgeEvaluate).toHaveBeenCalledTimes(1);
  });

  it('abstains without calling the judge when skipWhen returns a reason', async () => {
    // An empty output would otherwise be scored low by the judge, which reads as poor quality
    // rather than as a missing result.
    const { result, judgeEvaluate } = run(
      {
        skipWhen: (output) =>
          (output as { queries: unknown[] }).queries.length === 0
            ? 'No queries generated'
            : undefined,
      },
      { queries: [] }
    );

    const resolved = await result;
    expect(resolved.score).toBeNull();
    expect(resolved.label).toBe('unavailable');
    expect(resolved.explanation).toBe('No queries generated');
    // Not just abstaining — it must not spend an LLM call on an empty output.
    expect(judgeEvaluate).not.toHaveBeenCalled();
  });

  it('still judges when skipWhen returns undefined', async () => {
    const { result, judgeEvaluate } = run(
      { skipWhen: () => undefined },
      { queries: [{ esql: 'FROM logs' }] }
    );

    expect((await result).score).toBe(0.5);
    expect(judgeEvaluate).toHaveBeenCalledTimes(1);
  });

  it('abstains when no criteria are resolved, regardless of skipWhen', async () => {
    const { criteriaFn, evaluate } = createJudge();
    const evaluator = createScenarioCriteriaLlmEvaluator({ criteriaFn, criteria: [] });

    const result = await evaluator.evaluate({
      input: {},
      output: { queries: [{ esql: 'FROM logs' }] } as Parameters<
        typeof evaluator.evaluate
      >[0]['output'],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('applies transformOutput before handing the output to the judge', async () => {
    const { criteriaFn, evaluate } = createJudge();
    // Annotated explicitly: inferring it from `evaluator` would be circular.
    type Output = TaskOutput & { queries: unknown[] };

    const evaluator = createScenarioCriteriaLlmEvaluator<Example, Output>({
      criteriaFn: criteriaFn as unknown as (c: EvaluationCriterion[]) => Evaluator<Example, Output>,
      criteria,
      transformOutput: () => ({ queries: ['transformed'] } as Output),
    });

    await evaluator.evaluate({
      input: {},
      output: { queries: [] } as Output,
      expected: {},
      metadata: null,
    });

    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ output: { queries: ['transformed'] } })
    );
  });
});
