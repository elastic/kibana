/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { codeEvaluators, createEvaluators } from './evaluators';
import type { PlanExtractionExample } from './types';

const tree =
  'flowchart TD\nS1([Synthetic latency alert])\nE1[Inspect service latency metrics]\nX1((Latency cause identified))\nX2((Escalate issue))\nS1 -->|✅ inspect| E1\nE1 -->|✅ confirmed| X1\nE1 -->|unconfirmed| X2';
const score = async (
  decision_tree_mermaid: string,
  input: PlanExtractionExample['input'] = {},
  metadata: PlanExtractionExample['metadata'] = { langsmith_example_id: 'synthetic' }
) =>
  Object.fromEntries(
    await Promise.all(
      codeEvaluators.map(async (evaluator) => [
        evaluator.name,
        await evaluator.evaluate({
          input,
          output: { decision_tree_mermaid, error: '' },
          expected: {},
          metadata,
        }),
      ])
    )
  );

describe('extraction CODE evaluators', () => {
  it('grades a complete tree after removing its Markdown fence', async () => {
    expect(await score('```mermaid\n' + tree + '\n```')).toEqual({
      structural_validity: { score: 1, explanation: 'all checks passed' },
      taken_path_coverage: {
        score: 1,
        explanation: 'taken=2/3 from_S=True to_X=True connectivity=1.00',
      },
      evolution_preservation: { score: 1, explanation: 'n/a (new tree case)' },
    });
  });
});

it.each([
  ['', 'empty output'],
  ['flowchart TD', 'no edges parsed'],
  ['flowchart TD\nS1 --> X1', 'no taken edges found'],
])('explains unscorable taken paths (%p)', async (mermaid, explanation) => {
  expect((await score(mermaid)).taken_path_coverage).toEqual({ score: 0, explanation });
});

it('keeps the extraction-specific space and styling regexes and every structural failure', async () => {
  expect((await score('graph LR\nstyle S1 fill:red')).structural_validity).toEqual({
    score: 0,
    explanation:
      'failed: starts_with_flowchart_td, no_styling_directives, has_symptom_node, has_evidence_gatherer, has_end_node, has_taken_path_edges',
  });
  expect((await score(tree.replaceAll('-->|', '--> |'))).structural_validity.score).toBe(0.833);
});

it('penalizes marking every edge, missing endpoints, and disconnected taken branches', async () => {
  expect((await score('S1 -->|✅ yes| X1')).taken_path_coverage).toEqual({
    score: 0.95,
    explanation: 'taken=1/1 from_S=True to_X=True connectivity=1.00',
  });
  expect((await score('E1 -->|✅ yes| E2')).taken_path_coverage).toEqual({
    score: 0.35,
    explanation: 'taken=1/1 from_S=False to_X=False connectivity=1.00',
  });
  expect(
    (await score('S1 -->|✅ yes| X1\nE8 -->|✅ yes| X8\nS1 -->|no| X2')).taken_path_coverage
  ).toEqual({ score: 0.85, explanation: 'taken=2/3 from_S=True to_X=True connectivity=0.50' });
  expect(
    (await score('S1 -->|✅ yes| E1\nE1 -->|✅ loop| S1\nE1 -->|✅ done| X1')).taken_path_coverage
      .score
  ).toBe(0.95);
});

it('handles evolution applicability, missing output, and missing source labels', async () => {
  expect((await score('', { existing_tree_mermaid: tree })).evolution_preservation).toEqual({
    score: 0,
    explanation: 'empty output',
  });
  expect(
    (
      await score(
        '',
        { existing_tree_mermaid: tree },
        { langsmith_example_id: 'synthetic', case_type: 'new_tree_example' }
      )
    ).evolution_preservation.score
  ).toBe(1);
  expect(
    (await score(tree, { existing_tree_mermaid: 'flowchart TD' })).evolution_preservation
  ).toEqual({ score: 1, explanation: 'no labels in existing tree' });
});

it('preserves source labels using three-word fragments or short-label containment', async () => {
  const existing =
    'E1[Inspect <b>service</b> latency metrics]\nE2[restarts]\nE3[Investigate completely unrelated condition]';
  expect(
    (
      await score('E9[Inspect service latency by host]\nE8[Check restarts now]', {
        existing_tree_mermaid: existing,
      })
    ).evolution_preservation
  ).toEqual({ score: 0.5, explanation: '1/2 existing labels fuzzily preserved' });
  expect(
    (await score('E8[latency spike]', { existing_tree_mermaid: 'E1[latency spike]' }))
      .evolution_preservation.score
  ).toBe(1);
});

const quality = (output: jest.Mock) => {
  const evaluator = createEvaluators({ output }).find(({ name }) => name === 'llm_judge_quality');
  if (!evaluator) throw new Error('Missing quality evaluator');
  return evaluator;
};
const params = {
  input: {
    messages: [{ type: 'human', content: 'Synthetic alert' }],
    existing_tree_mermaid: 'flowchart TD\nS1([Synthetic symptom])',
  },
  output: { decision_tree_mermaid: tree, error: '' },
  expected: { expected_tree_mermaid: 'flowchart TD' },
  metadata: { langsmith_example_id: 'synthetic' },
};

it.each([
  [1, 0],
  [3, 0.5],
  [5, 1],
])('normalizes the quality judge rating %p', async (rating, expected) => {
  const output = jest
    .fn()
    .mockResolvedValue({ output: { score: rating, reason: 'Synthetic reason' } });
  const evaluator = quality(output);
  expect(await evaluator.evaluate(params)).toEqual({
    score: expected,
    explanation: `rating=${rating}/5 — Synthetic reason`,
  });
  expect(output).toHaveBeenCalledTimes(1);
  expect(output.mock.calls[0][0].input).toContain('[HUMAN]: Synthetic alert');
  expect(output.mock.calls[0][0].input).toContain(
    'EXISTING TREE (should be preserved and evolved, not replaced)'
  );
  expect(evaluator.getVersion?.()).toMatch(/^[a-f0-9]{64}$/);
});

it('skips the quality judge for empty output and retains its failure fallback', async () => {
  const output = jest.fn().mockRejectedValue(new Error('unavailable'));
  expect(
    await quality(output).evaluate({ ...params, output: { decision_tree_mermaid: '', error: '' } })
  ).toEqual({ score: 0, explanation: 'empty output' });
  expect(output).not.toHaveBeenCalled();
  expect(await quality(output).evaluate(params)).toEqual({
    score: 0,
    explanation: 'judge failed: unavailable',
  });
});
