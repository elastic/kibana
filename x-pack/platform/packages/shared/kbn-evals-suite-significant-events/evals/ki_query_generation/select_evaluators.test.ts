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
import { selectQueryGenerationEvaluators } from './select_evaluators';
import { expectedGenerationOutcomeEvaluator } from '../../src/evaluators/ki_query_generation/expected_generation_outcome';

const evaluator = (name: string): Evaluator => ({
  name,
  kind: 'CODE',
  evaluate: async () => ({ score: 1, label: 'PASS' }),
});

const scenarioCriteria: ScenarioCriteriaConfig = {
  criteriaFn: () => evaluator('criteria'),
};

const setSelection = (value: string | undefined) => {
  if (value == null) {
    delete process.env.SELECTED_EVALUATORS;
  } else {
    process.env.SELECTED_EVALUATORS = value;
  }
};

describe('selectQueryGenerationEvaluators', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('throws for an empty evaluator array', () => {
    expect(() => selectQueryGenerationEvaluators([])).toThrow(/empty list/);
  });

  it('returns the nonempty input unchanged when the env var is unset', () => {
    setSelection(undefined);
    const evaluators = [evaluator('a'), evaluator('b')];
    expect(selectQueryGenerationEvaluators(evaluators)).toBe(evaluators);
  });

  it('throws for an empty requested name', () => {
    setSelection('');
    expect(() => selectQueryGenerationEvaluators([evaluator('a')])).toThrow(
      /Unknown evaluator\(s\)/
    );
  });

  it('selects exactly the requested evaluators', () => {
    setSelection('generation_success,tool_usage_validation');
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

  it('throws for a misspelled evaluator before model calls', () => {
    setSelection('generation_sucess');
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /generation_sucess/
    );
  });

  it('throws for a partially valid request and lists every unmatched name', () => {
    setSelection('generation_success,nope');
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /nope.*Available: generation_success/
    );
  });

  it('throws when the final list is empty', () => {
    setSelection(',');
    expect(() => selectQueryGenerationEvaluators([evaluator('a')])).toThrow(
      /Unknown evaluator\(s\)/
    );
  });
});

describe('selectQueryGenerationEvaluators with the real query-generation list', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('returns every evaluator in list order when unset', () => {
    setSelection(undefined);
    const evaluators = createKIQueryGenerationEvaluators(
      {} as ElasticsearchClient,
      scenarioCriteria,
      {} as Logger
    );
    expect(selectQueryGenerationEvaluators(evaluators)).toEqual(evaluators);
  });

  it('excludes all LLM evaluators from a code-only selection', () => {
    setSelection('generation_success,tool_usage_validation');
    const evaluators = createKIQueryGenerationEvaluators(
      {} as ElasticsearchClient,
      scenarioCriteria,
      {} as Logger
    );
    const selected = selectQueryGenerationEvaluators(evaluators);
    expect(selected.map((item) => item.name).sort()).toEqual([
      'generation_success',
      'tool_usage_validation',
    ]);
    expect(selected.every((item) => item.kind === 'CODE')).toBe(true);
  });
});

describe('empty-datastream canary evaluator independence', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('keeps the canary evaluator enabled when the main selection is valid', () => {
    process.env.SELECTED_EVALUATORS = 'generation_success,tool_usage_validation';
    // The canary always runs its mandatory deterministic evaluator directly,
    // bypassing SELECTED_EVALUATORS entirely.
    expect(expectedGenerationOutcomeEvaluator.name).toBe('expected_generation_outcome');
    expect(expectedGenerationOutcomeEvaluator.kind).toBe('CODE');
  });

  it('still fails fast on unknown main selections', () => {
    process.env.SELECTED_EVALUATORS = 'nope';
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /nope/
    );
  });

  it('still fails fast on blank selections', () => {
    process.env.SELECTED_EVALUATORS = '';
    expect(() => selectQueryGenerationEvaluators([evaluator('a')])).toThrow(/Unknown evaluator/);
  });

  it('still fails fast on trailing commas', () => {
    process.env.SELECTED_EVALUATORS = 'generation_success,';
    expect(() => selectQueryGenerationEvaluators([evaluator('generation_success')])).toThrow(
      /Unknown evaluator/
    );
  });
});
