/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { codeEvaluators, createGoldenEvaluators } from './evaluators';
import type { GoldenTaskOutput } from './types';

const output: GoldenTaskOutput = {
  test_id: 'synthetic',
  query: 'Debug this alert',
  max_latency_seconds: 300,
  latency_seconds: 301,
  metrics: {},
  tool_names_invoked: ['bash'],
  total_tool_calls: 50,
  failed_tool_calls: 10,
  final_answer: 'PEV-123 and service-one have a real issue.',
  healthcheck: null,
  as_of_offset_minutes: null,
  as_of_ts: null,
  severity_truth: null,
  outcome_after_as_of: null,
  execution_error: null,
  trajectory: [],
  investigation_id: 'investigation',
  conversation_id: 'conversation',
  workflow_status: 'completed',
  structured_report: null,
};

const evaluateCode = async (
  taskOutput = output,
  reference = 'PEV-123 service-one service-two false-positive'
) =>
  Object.fromEntries(
    await Promise.all(
      codeEvaluators.map(async (evaluator) => [
        evaluator.name,
        await evaluator.evaluate({
          input: { question: taskOutput.query },
          output: { ...taskOutput },
          expected: { reference_answer: reference },
          metadata: {
            langsmith_example_id: 'example',
            max_latency_seconds: 300,
            dataset_split: ['suite/investigate-lite'],
          },
        }),
      ])
    )
  );

describe('golden CODE evaluators', () => {
  it('matches Python rounding of binary floats at a decimal half boundary', async () => {
    const trajectory = Array.from({ length: 5 }, (_, index) => ({
      step_type: 'tool_call' as const,
      content: '',
      tool_name: 'bash',
      tool_args: { command: `synthetic ${index % 4}` },
      tool_output: null,
      success: true,
    }));
    const scores = await evaluateCode({
      ...output,
      total_tool_calls: 16,
      failed_tool_calls: 3,
      trajectory,
      latency_seconds: 0.0625,
      max_latency_seconds: 0.0625,
    });
    expect(scores.rca_investigation_efficiency.score).toBe(0.487);
    expect(scores.latency_ok.explanation).toBe('latency=0.062s budget=0.062s');
  });

  it('reproduces the numeric CODE scores from the Phase C reference document', async () => {
    // Phase C experiment e9a22c6f-c9ab-4c02-999b-7a044a480a39, example 0; all text is synthetic.
    const commands = Array.from({ length: 57 }, (_, index) => ({
      step_type: 'tool_call' as const,
      content: '',
      tool_name: 'bash',
      tool_args: { command: `synthetic query ${index % 54}` },
      tool_output: null,
      success: true,
    }));
    const scores = await evaluateCode(
      {
        ...output,
        max_latency_seconds: 300,
        latency_seconds: 264.37548327445984,
        total_tool_calls: 57,
        failed_tool_calls: 0,
        trajectory: commands,
        final_answer: 'Synthetic explanation',
      },
      'Synthetic reference'
    );
    expect(scores).toEqual({
      latency_ok: { score: 1, explanation: 'latency=264.375s budget=300.000s' },
      latency_seconds: { score: 264.37548327445984 },
      latency_budget_seconds: { score: 300 },
      tool_calls_total: { score: 57 },
      tool_calls_failed: { score: 0 },
      cost_usd: {
        score: null,
        explanation: 'Kibana does not provide a dollar-cost rollup; unavailable, not zero.',
      },
      rca_entity_recall: { score: 1, explanation: 'entities_in_ref=0 found=0 missed=[]' },
      rca_false_positive: { score: null },
      rca_investigation_efficiency: {
        score: 0.734,
        explanation:
          'tools=57 failed=0 unique_cmds=54 redundant=3 | count=0.36 fail=1.00 redundancy=0.84',
      },
    });
  });

  it('distinguishes missing evidence, no entities, and an inapplicable false-positive classification', async () => {
    const missing = await evaluateCode({ ...output, final_answer: '' });
    expect(missing.rca_entity_recall.score).toBeNull();
    expect(missing.rca_false_positive.score).toBe(0);
    const noEntities = await evaluateCode(output, 'An ordinary deployment');
    expect(noEntities.rca_entity_recall).toEqual({
      score: 1,
      explanation: 'entities_in_ref=0 found=0 missed=[]',
    });
    expect(noEntities.rca_false_positive.score).toBeNull();
  });

  it('penalizes repeated commands using the same 200-character comparison as Deductive', async () => {
    const command = {
      step_type: 'tool_call' as const,
      content: '',
      tool_name: 'bash',
      tool_args: { command: 'query' },
      tool_output: null,
      success: true,
    };
    const scores = await evaluateCode({
      ...output,
      total_tool_calls: 3,
      failed_tool_calls: 0,
      trajectory: [command, command, { ...command, tool_args: { command: 'another query' } }],
    });
    expect(scores.rca_investigation_efficiency).toEqual({
      score: 0.667,
      explanation:
        'tools=3 failed=0 unique_cmds=2 redundant=1 | count=1.00 fail=1.00 redundancy=0.00',
    });
  });

  it('scores latency, counts, recall and efficiency while preserving an unavailable dollar cost', async () => {
    const scores = await evaluateCode();
    expect(scores).toEqual({
      latency_ok: { score: 0, explanation: 'latency=301.000s budget=300.000s' },
      latency_seconds: { score: 301 },
      latency_budget_seconds: { score: 300 },
      tool_calls_total: { score: 50 },
      tool_calls_failed: { score: 10 },
      cost_usd: {
        score: null,
        explanation: 'Kibana does not provide a dollar-cost rollup; unavailable, not zero.',
      },
      rca_entity_recall: {
        score: 0.5,
        explanation: "entities_in_ref=4 found=2 missed=['false-positive', 'service-two']",
      },
      rca_false_positive: { score: 0, explanation: 'reference=false_positive agent=real_issue' },
      rca_investigation_efficiency: {
        score: 0.5,
        explanation:
          'tools=50 failed=10 unique_cmds=0 redundant=0 | count=0.50 fail=0.00 redundancy=1.00',
      },
    });
  });
});

describe('golden judge evaluators', () => {
  it('caches judge failure and preserves nulls and the Python anti-leakage fallback', async () => {
    const inferenceOutput = jest.fn().mockRejectedValue(new Error('Judge unavailable'));
    const taskOutput = { ...output, final_answer: '80% confidence. Resolution text.' };
    const evaluators = createGoldenEvaluators({ output: inferenceOutput }).filter(
      ({ kind, name }) => kind === 'LLM' && name !== 'goal_pass'
    );
    const scores = Object.fromEntries(
      await Promise.all(
        evaluators.map(async (evaluator) => [
          evaluator.name,
          await evaluator.evaluate({
            input: { question: output.query },
            output: { ...taskOutput },
            expected: { reference_answer: 'Synthetic reference' },
            metadata: { langsmith_example_id: 'id', max_latency_seconds: 300, dataset_split: [] },
          }),
        ])
      )
    );
    expect(Object.keys(scores)).toHaveLength(8);
    expect(scores.rca_anti_leakage).toEqual({
      score: 0,
      explanation: 'post-incident text in final answer',
    });
    for (const [name, score] of Object.entries(scores)) {
      if (name !== 'rca_anti_leakage') expect(score).toEqual({ score: null });
    }
    expect(inferenceOutput).toHaveBeenCalledTimes(3);
  });

  it('keeps all eighteen golden score keys and hashes every LLM evaluator version', () => {
    const evaluators = createGoldenEvaluators({ output: jest.fn() });
    expect(new Set(evaluators.map(({ name }) => name)).size).toBe(18);
    for (const evaluator of evaluators.filter(({ kind }) => kind === 'LLM'))
      expect(evaluator.getVersion?.()).toMatch(/^[a-f0-9]{64}$/);
  });

  it('maps independent hypothesis and evidence judgments to their original rewards', async () => {
    const inferenceOutput = jest
      .fn()
      .mockResolvedValueOnce({
        output: {
          num_hypotheses: 2,
          top_hypothesis_probability: 0.3,
          hypotheses_are_distinct: true,
          primary_hypothesis_is_specific: false,
          reasoning: 'Distinct but vague',
        },
      })
      .mockResolvedValueOnce({
        output: {
          claims_with_metric_evidence: 2,
          claims_without_evidence: 2,
          evidence_is_quantitative: true,
          causal_chain_grounded: false,
          reasoning: 'Missing causal links',
        },
      });
    const evaluators = createGoldenEvaluators({ output: inferenceOutput }).filter(({ name }) =>
      ['rca_hypothesis_focus', 'rca_evidence_quality'].includes(name)
    );
    const scores = await Promise.all(
      evaluators.map((evaluator) =>
        evaluator.evaluate({
          input: { question: output.query },
          output,
          expected: { reference_answer: 'Synthetic reference' },
          metadata: { langsmith_example_id: 'id', max_latency_seconds: 300, dataset_split: [] },
        })
      )
    );
    expect(scores).toEqual([
      {
        score: 0.625,
        explanation: 'hypotheses=2 top_p=30% distinct=True specific=False | Distinct but vague',
      },
      {
        score: 0.5,
        explanation: 'grounded=2/4 quantitative=True causal_chain=False | Missing causal links',
      },
    ]);
    expect(inferenceOutput).toHaveBeenCalledTimes(2);
  });

  it.each([
    [0.5, 0.5],
    [0.1235, 0.123],
    [0.0005, 0.001],
  ])(
    'shares a single semantic judgment and matches Python rounding of %p',
    async (signalScore, expectedScore) => {
      const inferenceOutput = jest.fn().mockResolvedValue({
        output: {
          reference_mechanism_class: 'deployment',
          agent_mechanism_class: 'deployment',
          mechanism_class_match: true,
          timeline_contradiction_found: false,
          timeline_reasoning: 'Cause precedes effect',
          signal_coverage_score: signalScore,
          signal_coverage_reasoning: 'Half the signals',
          is_combined_cause: true,
          cause_completeness_score: 0.5,
          stated_confidence: 0.8,
          confidence_overconfident: false,
          used_post_incident_evidence: true,
          anti_leakage_reasoning: 'Used resolution text',
        },
      });
      const names = [
        'rca_mechanism_class',
        'rca_timeline_ok',
        'rca_signal_coverage',
        'rca_cause_completeness',
        'rca_confidence_ok',
        'rca_anti_leakage',
      ];
      const taskOutput = {
        ...output,
        final_answer: 'Deployment, 80% confidence. Resolved at noon.',
      };
      const scores = await Promise.all(
        createGoldenEvaluators({ output: inferenceOutput })
          .filter(({ name }) => names.includes(name))
          .map((evaluator) =>
            evaluator.evaluate({
              input: { question: output.query },
              output: { ...taskOutput },
              expected: { reference_answer: 'Synthetic reference' },
              metadata: { langsmith_example_id: 'id', max_latency_seconds: 300, dataset_split: [] },
            })
          )
      );
      expect(scores).toEqual([
        { score: 1, explanation: 'reference=deployment agent=deployment' },
        { score: 1, explanation: 'Cause precedes effect' },
        { score: expectedScore, explanation: 'Half the signals' },
        { score: 0.5, explanation: 'is_combined=True' },
        { score: 1, explanation: 'stated_confidence=80% overconfident=False' },
        { score: 0, explanation: 'Used resolution text' },
      ]);
      expect(inferenceOutput).toHaveBeenCalledTimes(1);
    }
  );

  it('uses the investigation rubric and preserves the graded goal score', async () => {
    const inferenceOutput = jest
      .fn()
      .mockResolvedValue({ output: { score: 3, summary: 'Some relevant details' } });
    const evaluator = createGoldenEvaluators({ output: inferenceOutput }).find(
      ({ name }) => name === 'goal_pass'
    );
    if (!evaluator) throw new Error('Missing goal evaluator');
    const result = await evaluator.evaluate({
      input: { question: output.query },
      output,
      expected: { reference_answer: 'Synthetic reference' },
      metadata: {
        category: 'uncategorized',
        langsmith_example_id: 'id',
        max_latency_seconds: 300,
        dataset_split: [],
      },
    });
    expect(result).toEqual({ score: 0.5, explanation: 'Some relevant details' });
    expect(inferenceOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('**5 — Found the root cause.**'),
        input: expect.stringContaining('## Agent Trajectory\nNo trajectory available.'),
      })
    );
    expect(evaluator.getVersion?.()).toMatch(/^[a-f0-9]{64}$/);
  });
});
