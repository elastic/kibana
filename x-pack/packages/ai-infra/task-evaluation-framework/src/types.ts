/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaybePromise } from '@kbn/utility-types';

interface TestRunningContext {
  testId: string;
}

interface EvaluationResult {}

type EvaluateeFn<TaskInput, TaskOutput> = (params: {
  input: TaskInput;
  context: TestRunningContext;
}) => MaybePromise<TaskOutput>;

type EvaluatorFn<TaskInput, TaskOutput, EvaluationCriteria> = (evaluatorParams: {
  input: TaskInput;
  output: TaskOutput;
  criteria: EvaluationCriteria[];
  context: TestRunningContext;
}) => MaybePromise<EvaluationResult>;

interface Evaluation<TaskInput, EvaluationCriteria> {
  evaluationId: string;
  input: TaskInput;
  criteria: EvaluationCriteria[];
}

type EvaluationSuite<TaskInput, TaskOutput, EvaluationCriteria> = {
  evaluatee: EvaluateeFn<TaskInput, TaskOutput>;
  evaluator: EvaluatorFn<TaskInput, TaskOutput, EvaluationCriteria>;
  evaluations: Array<Evaluation<TaskInput, EvaluationCriteria>>;
};

const suiteRunner = async <I, O, E>(suite: EvaluationSuite<I, O, E>) => {
  const { evaluations, evaluatee, evaluator } = suite;

  const context: any = {}; // TODO

  for (const evaluation of evaluations) {
    const { evaluationId, input, criteria } = evaluation;
    const output = await evaluatee({ input, context });
    const result = await evaluator({ context, input, output, criteria });
  }
};
