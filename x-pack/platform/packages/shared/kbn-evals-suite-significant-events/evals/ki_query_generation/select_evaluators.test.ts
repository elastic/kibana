/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Evaluator } from '@kbn/evals';
import {
  createKIQueryGenerationEvaluators,
  type ScenarioCriteriaConfig,
} from '../../src/evaluators/ki_query_generation';
import { getEmptyDatastreamEvaluators, selectQueryGenerationEvaluators } from './select_evaluators';

const SHARED_EVALUATORS_ENV = 'SELECTED_EVALUATORS';
const QUERY_GENERATION_EVALUATORS_ENV = 'KI_QUERY_GENERATION_EVALUATORS';

const evaluator = (name: string): Evaluator => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async () => ({ score: 1, label: 'PASS' }),
});

const scenarioCriteria: ScenarioCriteriaConfig = {
  criteriaFn: () => evaluator('criteria'),
};

const setEnv = (name: string, value: string | undefined) => {
  if (value == null) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

describe('selectQueryGenerationEvaluators', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    delete process.env[SHARED_EVALUATORS_ENV];
    delete process.env[QUERY_GENERATION_EVALUATORS_ENV];
  });

  afterAll(() => {
    process.env = { ...ORIGINAL };
  });

  it('throws for an empty evaluator array', () => {
    expect(() => selectQueryGenerationEvaluators([])).toThrow(/empty list/);
  });

  it('returns the nonempty input unchanged when both env vars are unset', () => {
    const evaluators = [evaluator('a'), evaluator('b')];
    expect(selectQueryGenerationEvaluators(evaluators)).toBe(evaluators);
  });

  it('follows the shared permissive selection for SELECTED_EVALUATORS and never throws for unknown names', () => {
    setEnv(SHARED_EVALUATORS_ENV, 'Factuality');
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).not.toThrow();
    expect(selectQueryGenerationEvaluators([evaluator('generation_success')])).toEqual([]);
  });

  it('SELECTED_EVALUATORS selects exact names shared with the rest of the suite', () => {
    setEnv(SHARED_EVALUATORS_ENV, 'generation_success');
    const selected = selectQueryGenerationEvaluators([
      evaluator('generation_success'),
      evaluator('tool_usage_validation'),
    ]);
    expect(selected.map((item) => item.name)).toEqual(['generation_success']);
  });

  it('KI_QUERY_GENERATION_EVALUATORS strictly selects exact names', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'generation_success,tool_usage_validation');
    const selected = selectQueryGenerationEvaluators([
      evaluator('generation_success'),
      evaluator('tool_usage_validation'),
      evaluator('syntax_validation'),
    ]);
    expect(selected.map((item) => item.name)).toEqual([
      'generation_success',
      'tool_usage_validation',
    ]);
  });

  it('fails fast on unknown KI_QUERY_GENERATION_EVALUATORS names before model calls', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'generation_sucess');
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /Unknown evaluator\(s\) requested via KI_QUERY_GENERATION_EVALUATORS: generation_sucess/
    );
  });

  it('fails fast on a partially valid request and lists every unmatched name', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'generation_success,nope');
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /nope.*Available: generation_success/
    );
  });

  it('fails an empty KI_QUERY_GENERATION_EVALUATORS value with the original input visible', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, '');
    expect(() => selectQueryGenerationEvaluators([evaluator('a')])).toThrow(
      /without empty items; received ""/
    );
  });

  it('fails a trailing-comma KI_QUERY_GENERATION_EVALUATORS value with the original input visible', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'generation_success, ');
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /without empty items; received "generation_success, "/
    );
  });
});

describe('selectQueryGenerationEvaluators with the real query-generation list', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    delete process.env[SHARED_EVALUATORS_ENV];
    delete process.env[QUERY_GENERATION_EVALUATORS_ENV];
  });

  afterAll(() => {
    process.env = { ...ORIGINAL };
  });

  const realEvaluators = () =>
    createKIQueryGenerationEvaluators({} as ElasticsearchClient, scenarioCriteria, {} as Logger);

  it('returns every evaluator in list order when both env vars are unset', () => {
    const evaluators = realEvaluators();
    expect(selectQueryGenerationEvaluators(evaluators)).toEqual(evaluators);
  });

  it('SELECTED_EVALUATORS selects exact names from the real list permissively', () => {
    setEnv(SHARED_EVALUATORS_ENV, 'generation_success');
    const selected = selectQueryGenerationEvaluators(realEvaluators());
    expect(selected.map((item) => item.name)).toEqual(['generation_success']);
    expect(selected.every((item) => item.kind === 'CODE')).toBe(true);
  });

  it('KI_QUERY_GENERATION_EVALUATORS can select the mandatory canary evaluator from the real list', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'expected_generation_outcome');
    const selected = selectQueryGenerationEvaluators(realEvaluators());
    expect(selected.map((item) => item.name)).toEqual(['expected_generation_outcome']);
  });

  it('KI_QUERY_GENERATION_EVALUATORS excludes all LLM evaluators from a code-only selection', () => {
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'generation_success,tool_usage_validation');
    const selected = selectQueryGenerationEvaluators(realEvaluators());
    expect(selected.map((item) => item.name).sort()).toEqual([
      'generation_success',
      'tool_usage_validation',
    ]);
    expect(selected.every((item) => item.kind === 'CODE')).toBe(true);
  });
});

describe('empty-datastream canary evaluator independence', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    delete process.env[SHARED_EVALUATORS_ENV];
    delete process.env[QUERY_GENERATION_EVALUATORS_ENV];
  });

  afterAll(() => {
    process.env = { ...ORIGINAL };
  });

  it('keeps the mandatory evaluator enabled regardless of either selection variable', () => {
    setEnv(SHARED_EVALUATORS_ENV, 'Factuality');
    setEnv(QUERY_GENERATION_EVALUATORS_ENV, 'generation_success,tool_usage_validation');

    expect(getEmptyDatastreamEvaluators()).toEqual([
      expect.objectContaining({
        name: 'expected_generation_outcome',
        kind: 'CODE',
      }),
    ]);
  });

  it('keeps the mandatory evaluator enabled when both variables are unset', () => {
    expect(getEmptyDatastreamEvaluators()).toEqual([
      expect.objectContaining({
        name: 'expected_generation_outcome',
        kind: 'CODE',
      }),
    ]);
  });
});
