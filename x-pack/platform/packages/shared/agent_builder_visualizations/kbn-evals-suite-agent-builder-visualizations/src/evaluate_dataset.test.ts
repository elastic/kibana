/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type {
  AgentBuilderClient,
  DefaultEvaluators,
  EvalsExecutorClient,
  Evaluator,
} from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEvaluateDataset, describeRequest } from './evaluate_dataset';

const buildEvaluator = (name: string): Evaluator => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: jest.fn().mockResolvedValue({ score: 0 }),
});

const VISUALIZATION_STEP = {
  type: 'tool_call',
  tool_id: 'platform.core.create_visualization',
  results: [
    {
      type: 'visualization',
      data: {
        esql: 'FROM kibana_sample_data_logs | STATS c = COUNT(*)',
        chart_type: 'metric',
        renderer: 'lens',
        visualization: { type: 'metric', metrics: [{ column: 'c' }] },
      },
    },
  ],
};

const buildDeps = () => {
  const runExperiment = jest.fn().mockResolvedValue(undefined);
  const converse = jest.fn().mockResolvedValue({
    message: 'Here is your chart.',
    steps: [{ type: 'tool_call', tool_id: 'load_skill', results: [] }, VISUALIZATION_STEP],
    traceId: 'trace-id-fixture',
    conversationId: 'conversation-1',
    prompts: [],
  });

  return {
    runExperiment,
    converse,
    deps: {
      agentBuilderClient: { converse } as unknown as AgentBuilderClient,
      agentId: 'default-agent',
      evaluators: {
        traceBasedEvaluators: {
          inputTokens: buildEvaluator('Input tokens'),
          outputTokens: buildEvaluator('Output tokens'),
          cachedTokens: buildEvaluator('Cached tokens'),
          toolCalls: buildEvaluator('Tool calls'),
          latency: buildEvaluator('Latency'),
        },
      } as unknown as DefaultEvaluators,
      executorClient: { runExperiment } as unknown as EvalsExecutorClient,
      inferenceClient: {} as unknown as BoundInferenceClient,
      esClient: {} as unknown as EsClient,
      log: { warning: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as ToolingLog,
    },
  };
};

const runDataset = async () => {
  const { runExperiment, converse, deps } = buildDeps();
  await createEvaluateDataset(deps)({
    dataset: {
      name: 'fixture dataset',
      description: 'fixture',
      examples: [{ input: { question: 'Show total requests' }, output: {} }],
    },
  });
  const [{ task }, evaluatorArray] = runExperiment.mock.calls[0];
  return { task, evaluatorArray, converse, deps };
};

describe('createEvaluateDataset', () => {
  it('registers the quality, trajectory, and trace-based evaluators in a fixed order', async () => {
    const { evaluatorArray } = await runDataset();

    expect(evaluatorArray.map((evaluator: Evaluator) => [evaluator.name, evaluator.kind])).toEqual([
      ['ES|QL Execution Validity', 'CODE'],
      ['ES|QL Functional Equivalence', 'LLM'],
      ['ES|QL Result Equivalence', 'CODE'],
      ['Chart Type vs Intent', 'LLM'],
      ['Renderer vs Intent', 'CODE'],
      ['Visualization Config Validity', 'CODE'],
      ['Visualization Config vs Intent', 'CODE'],
      ['Column Binding Integrity', 'CODE'],
      ['Chart Compatible Result', 'CODE'],
      ['Visualization Refusal', 'CODE'],
      ['trajectory', 'CODE'],
      ['Input tokens', 'CODE'],
      ['Output tokens', 'CODE'],
      ['Cached tokens', 'CODE'],
      ['Tool calls', 'CODE'],
      ['Latency', 'CODE'],
    ]);
  });

  it('drives converse and extracts visualizations, joined ES|QL, and the agent trace id', async () => {
    const { task, converse } = await runDataset();

    const output = await task({ input: { question: 'Show total requests' }, metadata: {} });

    expect(converse).toHaveBeenCalledWith({
      agentId: 'default-agent',
      input: 'Show total requests',
    });
    expect(output).toEqual(
      expect.objectContaining({
        esql: 'FROM kibana_sample_data_logs | STATS c = COUNT(*)',
        agentTraceId: 'trace-id-fixture',
        turns: 1,
        prompts: [],
        messages: [{ message: 'Here is your chart.' }],
        visualizations: [expect.objectContaining({ chartType: 'metric', renderer: 'lens' })],
      })
    );
  });

  it('runs a follow-up turn in the same conversation and scores the edit', async () => {
    const { task, converse } = await runDataset();
    converse
      .mockResolvedValueOnce({
        message: 'First chart.',
        steps: [{ type: 'tool_call', tool_id: 'load_skill', results: [] }, VISUALIZATION_STEP],
        traceId: 'trace-1',
        conversationId: 'conversation-1',
      })
      .mockResolvedValueOnce({
        message: 'Edited chart.',
        steps: [VISUALIZATION_STEP],
        traceId: 'trace-2',
        conversationId: 'conversation-1',
      });

    const output = await task({
      input: { question: 'Create a bar chart', followUp: 'Make it horizontal' },
      metadata: {},
    });

    expect(converse).toHaveBeenCalledTimes(2);
    expect(converse).toHaveBeenLastCalledWith({
      agentId: 'default-agent',
      input: 'Make it horizontal',
      conversationId: 'conversation-1',
    });
    expect(output).toEqual(
      expect.objectContaining({
        turns: 2,
        agentTraceId: 'trace-2',
        messages: [{ message: 'Edited chart.' }],
        steps: [
          expect.objectContaining({ tool_id: 'load_skill' }),
          expect.objectContaining({ tool_id: 'platform.core.create_visualization' }),
          expect.objectContaining({ tool_id: 'platform.core.create_visualization' }),
        ],
      })
    );
  });

  it('carries clarifying prompts from the last turn into the output', async () => {
    const { task, converse } = await runDataset();
    converse.mockResolvedValueOnce({
      message: '',
      steps: [],
      traceId: 'trace-1',
      prompts: [{ type: 'ask_user_question', questions: [] }],
    });

    const output = await task({ input: { question: 'Create a chart.' }, metadata: {} });

    expect(output.prompts).toEqual([{ type: 'ask_user_question', questions: [] }]);
  });

  it('does not wrap trace-based evaluators in low-score logging', async () => {
    const { evaluatorArray, deps } = await runDataset();
    const warning = deps.log.warning as jest.Mock;
    const toolCalls = evaluatorArray.find(
      (evaluator: Evaluator) => evaluator.name === 'Tool calls'
    );

    await toolCalls.evaluate({
      input: { question: 'q' },
      output: { errors: [], messages: [], agentTraceId: 't' },
      expected: {},
      metadata: {},
    });

    expect(warning).not.toHaveBeenCalled();
  });

  it('lets an example override the agent through metadata', async () => {
    const { task, converse } = await runDataset();

    await task({ input: { question: 'q' }, metadata: { agentId: 'custom-agent' } });

    expect(converse).toHaveBeenCalledWith(expect.objectContaining({ agentId: 'custom-agent' }));
  });

  it('skips positive-only evaluators on refusal examples', async () => {
    const { evaluatorArray } = await runDataset();
    const execution = evaluatorArray.find(
      (evaluator: Evaluator) => evaluator.name === 'ES|QL Execution Validity'
    );

    const result = await execution.evaluate({
      input: { question: 'q' },
      output: { errors: [], messages: [], visualizations: [], esql: '' },
      expected: { refusal: { reason: 'missing_index' } },
      metadata: {},
    });

    expect(result).toEqual(expect.objectContaining({ score: null, label: 'skipped' }));
  });

  it('remaps the agent trace id onto traceId for trace-based evaluators', async () => {
    const { evaluatorArray, deps } = await runDataset();
    const latency = evaluatorArray.find((evaluator: Evaluator) => evaluator.name === 'Latency');

    await latency.evaluate({
      input: { question: 'q' },
      output: { errors: [], messages: [], agentTraceId: 'agent-trace' },
      expected: {},
      metadata: {},
    });

    const innerEvaluate = deps.evaluators.traceBasedEvaluators.latency.evaluate as jest.Mock;
    const [[params]] = innerEvaluate.mock.calls;
    expect(params.output.traceId).toBe('agent-trace');
  });
});

describe('describeRequest', () => {
  it('returns the question alone for single-turn examples', () => {
    expect(describeRequest({ question: 'Create a bar chart.' })).toBe('Create a bar chart.');
  });

  it('appends the follow-up so judges see the edited intent', () => {
    expect(
      describeRequest({ question: 'Create a metric.', followUp: 'Show it as a pie instead.' })
    ).toBe('Create a metric.\nFollow-up: Show it as a pie instead.');
  });
});
