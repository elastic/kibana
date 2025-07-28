/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import {
  EvaluationResult,
  Evaluator as PhoenixEvaluator,
  TaskOutput,
} from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { EvaluationCriterion } from './evaluators/criteria';

export interface EvaluationDataset {
  name: string;
  description: string;
  examples: Example[];
  id?: undefined;
}

export interface EvaluationDatasetWithId extends Omit<EvaluationDataset, 'id'> {
  id: string;
}

export interface EvaluatorParams<TExample extends Example, TTaskOutput extends TaskOutput> {
  input: TExample['input'];
  output: TTaskOutput;
  expected: TExample['output'];
  metadata: TExample['metadata'];
}

type EvaluatorCallback<TExample extends Example, TTaskOutput extends TaskOutput> = (
  params: EvaluatorParams<TExample, TTaskOutput>
) => Promise<EvaluationResult>;

export interface Evaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
> extends Omit<PhoenixEvaluator, 'evaluate'> {
  evaluate: EvaluatorCallback<TExample, TTaskOutput>;
}

export interface DefaultEvaluators {
  criteria: (criteria: EvaluationCriterion[]) => Evaluator;
}

export type ExperimentTask<TExample extends Example, TTaskOutput extends TaskOutput> = (
  example: TExample
) => Promise<TTaskOutput>;

// simple version of Phoenix's ExampleWithId
export type ExampleWithId = Example & { id: string };
