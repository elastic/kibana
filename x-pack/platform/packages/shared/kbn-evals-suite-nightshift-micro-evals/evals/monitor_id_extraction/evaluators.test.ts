/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { codeEvaluators } from './evaluators';

const score = async (monitor_id: string, expected_monitor_id: string) =>
  Object.fromEntries(
    await Promise.all(
      codeEvaluators.map(async (evaluator) => [
        evaluator.name,
        await evaluator.evaluate({
          input: {},
          output: { monitor_id },
          expected: { expected_monitor_id },
          metadata: { langsmith_example_id: 'synthetic' },
        }),
      ])
    )
  );

describe('monitor evaluators', () => {
  it('trims both identifiers and matches them exactly', async () => {
    expect(await score('  SYN-123\n', ' SYN-123 ')).toEqual({
      exact_match: { score: 1, explanation: 'exact match' },
      non_empty_output: { score: 1, explanation: 'correctly non-empty' },
      format_validity: { score: 1, explanation: 'all checks passed' },
    });
  });
  it('treats a correct abstention as valid', async () => {
    expect(await score('', '')).toEqual({
      exact_match: { score: 1, explanation: 'exact match' },
      non_empty_output: { score: 1, explanation: 'empty abstention correct' },
      format_validity: { score: 1, explanation: 'empty string is valid' },
    });
  });
  it('reports unexpected output and missing output with Python repr comments', async () => {
    expect((await score('123', '')).non_empty_output).toEqual({
      score: 0,
      explanation: "expected empty but got '123'",
    });
    expect((await score('', '123')).non_empty_output).toEqual({
      score: 0,
      explanation: "expected non-empty ('123') but got empty string",
    });
    expect((await score('123', 'ABC')).exact_match).toEqual({
      score: 0,
      explanation: "got '123', expected 'ABC'",
    });
    expect((await score("it's\nwrong", 'ABC')).exact_match.explanation).toBe(
      "got \"it's\\nwrong\", expected 'ABC'"
    );
  });
  it.each([
    ['two words', 0.75, 'no_internal_spaces'],
    ['a\nb', 0.75, 'no_newlines'],
    ['a\rb', 0.75, 'no_newlines'],
    ['"id"', 0.75, 'no_surrounding_quotes'],
    ["'a b\nc'", 0.25, 'no_newlines, no_surrounding_quotes, no_internal_spaces'],
  ])('reports format failures in Python order (%p)', async (actual, value, checks) => {
    expect((await score(actual, '')).format_validity).toEqual({
      score: value,
      explanation: `failed: ${checks}`,
    });
  });
});
