/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { codeEvaluators, createEvaluators } from './evaluators';
import type { PlanMergeExample } from './types';

const tree =
  'flowchart TD\nS1([Synthetic latency alert])\nE1[Inspect metrics]\nX1((Synthetic cause))\nX2((Escalate))\nS1 -->|✅ inspect| E1\nE1 -->|✅ confirmed| X1\nE1 -->|unconfirmed| X2';
const spec = {
  preserved_node_ids: ['S1', 'E1'],
  nodes_added: ['X1'],
  nodes_deleted: ['E2'],
  correct_terminal: 'X1',
  terminals_without_checkmark: ['X2'],
};
const score = async (
  merged_mermaid: string,
  expected: PlanMergeExample['output'] = { mutation_spec: spec }
) =>
  Object.fromEntries(
    await Promise.all(
      codeEvaluators.map(async (evaluator) => [
        evaluator.name,
        await evaluator.evaluate({
          input: {},
          output: { merged_mermaid },
          expected,
          metadata: { langsmith_example_id: 'synthetic' },
        }),
      ])
    )
  );

it('grades structure, preservation and correct terminal marks', async () => {
  expect(await score(tree)).toEqual({
    structural_validity: { score: 1, explanation: 'ok' },
    mutation_preservation: { score: 1, explanation: 'all 4 checks passed' },
    checkmark_placement: { score: 1, explanation: 'ok' },
  });
});

it('reports empty output while preserving the not-applicable rule order', async () => {
  expect(await score('')).toEqual({
    structural_validity: { score: 0, explanation: 'empty output' },
    mutation_preservation: { score: 0, explanation: 'empty output' },
    checkmark_placement: { score: 0, explanation: 'empty output' },
  });
  expect((await score('', {})).checkmark_placement).toEqual({ score: 1, explanation: 'no spec' });
  expect((await score(tree, {})).mutation_preservation).toEqual({
    score: 1,
    explanation: 'no spec',
  });
});

it('reports every structure and mutation check failure in Python order', async () => {
  expect((await score('graph LR\nCLASSDEF foo')).structural_validity).toEqual({
    score: 0,
    explanation:
      'failed: flowchart_td, no_styling, has_symptom_S, has_evidence_E, has_terminal_X, has_taken_path',
  });
  expect((await score('E2[Wrong]')).mutation_preservation).toEqual({
    score: 0,
    explanation:
      'missing preserved node S1; missing preserved node E1; added node X1 not found; deleted node E2 still present',
  });
  expect(
    (
      await score(
        tree.replace('✅ confirmed', 'unconfirmed').replace('unconfirmed| X2', '✅ wrong| X2')
      )
    ).checkmark_placement
  ).toEqual({ score: 0, explanation: "failed: ['✅→X1', 'no-✅→X2']" });
  expect(
    (await score(tree, { mutation_spec: { preserved_node_ids: ['S1', 'E1', 'D1'] } }))
      .mutation_preservation.score
  ).toBe(0.667);
});

it('retains merge-specific fence, whitespace and terminal parsing behavior', async () => {
  expect((await score('```mermaid\n' + tree + '\n```')).structural_validity.score).toBe(0.833);
  expect((await score(tree.replaceAll('-->|', '--> |'))).structural_validity.score).toBe(1);
  expect(
    (await score('S1 -->|"✅ yes"| X1a', { mutation_spec: { correct_terminal: 'X1a' } }))
      .checkmark_placement.score
  ).toBe(1);
  expect(
    (await score('S1 -->|no| X1', { mutation_spec: { terminals_without_checkmark: ['X1'] } }))
      .checkmark_placement.score
  ).toBe(1);
});

const judge = (name: string, output: jest.Mock) => {
  const evaluator = createEvaluators({ output }).find((candidate) => candidate.name === name);
  if (!evaluator) throw new Error(`Missing ${name}`);
  return evaluator;
};
const params = {
  input: { initial_tree_mermaid: tree, causal_summary: 'Synthetic feedback' },
  output: { merged_mermaid: tree },
  expected: { mutation_spec: spec },
  metadata: { langsmith_example_id: 'synthetic' },
};
const conflicting = tree.replace('unconfirmed| X2', '✅ other| X2');

it('short-circuits the conflict judge with zero or one taken terminal', async () => {
  const output = jest.fn();
  expect(await judge('no_conflicting_checkmarks', output).evaluate(params)).toEqual({
    score: 1,
    explanation: "single ✅ terminal: ['X1']",
  });
  expect(
    await judge('no_conflicting_checkmarks', output).evaluate({
      ...params,
      output: { merged_mermaid: 'flowchart TD' },
    })
  ).toEqual({ score: 1, explanation: "single ✅ terminal: ['none']" });
  expect(output).not.toHaveBeenCalled();
});

it.each([
  [true, 0, 'yes'],
  [false, 1, 'no'],
])('grades judge-reported conflict=%p', async (conflict, scoreValue, text) => {
  const output = jest.fn().mockResolvedValue({ output: { conflict, reason: 'Synthetic reason' } });
  const evaluator = judge('no_conflicting_checkmarks', output);
  expect(await evaluator.evaluate({ ...params, output: { merged_mermaid: conflicting } })).toEqual({
    score: scoreValue,
    explanation: `conflict=${text} (['X1', 'X2']) — Synthetic reason`,
  });
  expect(output).toHaveBeenCalledTimes(1);
  expect(output.mock.calls[0][0].input).toContain(
    "Multiple terminal nodes are reached via ✅-marked edges: ['X1', 'X2']"
  );
  expect(evaluator.getVersion?.()).toMatch(/^[a-f0-9]{64}$/);
});

it('retains the 0.5 conflict-judge failure fallback', async () => {
  const output = jest.fn().mockRejectedValue(new Error('unavailable'));
  expect(
    await judge('no_conflicting_checkmarks', output).evaluate({
      ...params,
      output: { merged_mermaid: conflicting },
    })
  ).toEqual({
    score: 0.5,
    explanation: "judge unavailable: unavailable; 2 ✅ terminals: ['X1', 'X2']",
  });
});

it.each(['mutation_correctness', 'no_conflicting_checkmarks'])(
  'skips %s for empty output',
  async (name) => {
    const output = jest.fn();
    expect(
      await judge(name, output).evaluate({ ...params, output: { merged_mermaid: '' } })
    ).toEqual({ score: 0, explanation: 'empty output' });
    expect(output).not.toHaveBeenCalled();
  }
);

it('grades the mutation judge and includes the Python mutation-spec text', async () => {
  const output = jest.fn().mockResolvedValue({ output: { score: 4, reason: 'Synthetic reason' } });
  const evaluator = judge('mutation_correctness', output);
  expect(await evaluator.evaluate(params)).toEqual({
    score: 0.75,
    explanation: 'rating=4/5 — Synthetic reason',
  });
  expect(output).toHaveBeenCalledTimes(1);
  expect(output.mock.calls[0][0].input).toContain(
    "Nodes that MUST appear: ['X1']\nNodes that MUST be absent: ['E2']"
  );
  expect(output.mock.calls[0][0].input).toContain('(not provided)');
  expect(evaluator.getVersion?.()).toMatch(/^[a-f0-9]{64}$/);
});

it('retains the mutation-judge zero fallback', async () => {
  expect(
    await judge(
      'mutation_correctness',
      jest.fn().mockRejectedValue(new Error('unavailable'))
    ).evaluate(params)
  ).toEqual({ score: 0, explanation: 'judge failed: unavailable' });
});
