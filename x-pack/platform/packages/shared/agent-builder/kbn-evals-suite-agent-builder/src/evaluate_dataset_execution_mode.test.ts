/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, EvalsExecutorClient, Evaluator } from '@kbn/evals';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AgentBuilderEvaluationChatClient } from './chat_client';
import { createEvaluateDataset, getRagEvaluationExecutionMode } from './evaluate_dataset';

const createCodeEvaluator = (name: string): Evaluator => {
  return {
    name,
    kind: 'CODE',
    evaluate: jest.fn().mockResolvedValue({ score: 1 }),
  };
};

const createMockEvaluators = () => {
  const correctnessEvaluate = jest.fn().mockResolvedValue({ metadata: { pass: true } });
  const groundednessEvaluate = jest.fn().mockResolvedValue({ metadata: { pass: true } });

  const evaluators: DefaultEvaluators = {
    criteria: () => createCodeEvaluator('Criteria'),
    correctnessAnalysis: () =>
      ({
        name: 'Correctness Analysis',
        kind: 'LLM',
        evaluate: correctnessEvaluate,
      } as Evaluator),
    groundednessAnalysis: () =>
      ({
        name: 'Groundedness Analysis',
        kind: 'LLM',
        evaluate: groundednessEvaluate,
      } as Evaluator),
    traceBasedEvaluators: {
      inputTokens: createCodeEvaluator('Input Tokens'),
      outputTokens: createCodeEvaluator('Output Tokens'),
      cachedTokens: createCodeEvaluator('Cached Tokens'),
      toolCalls: createCodeEvaluator('Tool Calls'),
      latency: createCodeEvaluator('Latency'),
    },
  };

  return {
    evaluators,
    correctnessEvaluate,
    groundednessEvaluate,
  };
};

const createExecutorClient = () => {
  const runExperiment = jest.fn().mockResolvedValue({ id: 'exp', runs: {}, evaluationRuns: [] });
  const executorClient = {
    runExperiment,
    getRanExperiments: jest.fn().mockResolvedValue([]),
  } as unknown as EvalsExecutorClient;

  return { executorClient, runExperiment };
};

const createChatClient = () => {
  return {
    converse: jest.fn(),
    executeTool: jest.fn(),
  } as unknown as jest.Mocked<AgentBuilderEvaluationChatClient>;
};

describe('RAG evaluation execution mode', () => {
  const originalRagEvalExecutionMode = process.env.RAG_EVAL_EXECUTION_MODE;
  const originalSelectedEvaluators = process.env.SELECTED_EVALUATORS;
  const originalRagEvalK = process.env.RAG_EVAL_K;

  afterEach(() => {
    if (originalRagEvalExecutionMode === undefined) {
      delete process.env.RAG_EVAL_EXECUTION_MODE;
    } else {
      process.env.RAG_EVAL_EXECUTION_MODE = originalRagEvalExecutionMode;
    }

    if (originalSelectedEvaluators === undefined) {
      delete process.env.SELECTED_EVALUATORS;
    } else {
      process.env.SELECTED_EVALUATORS = originalSelectedEvaluators;
    }

    if (originalRagEvalK === undefined) {
      delete process.env.RAG_EVAL_K;
    } else {
      process.env.RAG_EVAL_K = originalRagEvalK;
    }
  });

  it('defaults to converse mode when env var is unset', () => {
    expect(getRagEvaluationExecutionMode({})).toBe('converse');
  });

  it('throws for unsupported execution mode values', () => {
    expect(() =>
      getRagEvaluationExecutionMode({
        RAG_EVAL_EXECUTION_MODE: 'invalid_mode',
      })
    ).toThrow(
      'Invalid RAG_EVAL_EXECUTION_MODE value: "invalid_mode". Expected one of: converse, search_tool.'
    );
  });

  it('uses converse task and full evaluator set by default', async () => {
    delete process.env.RAG_EVAL_EXECUTION_MODE;
    delete process.env.SELECTED_EVALUATORS;
    delete process.env.RAG_EVAL_K;

    const { evaluators, correctnessEvaluate, groundednessEvaluate } = createMockEvaluators();
    const { executorClient, runExperiment } = createExecutorClient();
    const chatClient = createChatClient();

    chatClient.converse.mockResolvedValue({
      conversationId: 'conversation-id',
      messages: [{ message: 'assistant answer' }],
      errors: [],
      steps: [{ type: 'tool_call', tool_id: platformCoreTools.search, results: [] }],
      traceId: 'trace-id',
    });

    const evaluateDataset = createEvaluateDataset({
      evaluators,
      executorClient,
      chatClient,
      traceEsClient: {} as EsClient,
      log: {} as ToolingLog,
    });

    const example = {
      input: { question: 'Where can I update my billing details?' },
      output: {
        expected: 'You can update billing details from account settings.',
        groundTruth: {
          wix_knowledge_base: {
            'doc-1': 1,
          },
        },
      },
      metadata: {},
    };

    await evaluateDataset({
      dataset: {
        name: 'test dataset',
        description: 'dataset description',
        examples: [example],
      },
    });

    const [options, selectedEvaluators] = runExperiment.mock.calls[0];
    const taskOutput = await options.task(example);

    expect(chatClient.converse).toHaveBeenCalledTimes(1);
    expect(chatClient.executeTool).not.toHaveBeenCalled();
    expect(taskOutput).toMatchObject({
      traceId: 'trace-id',
      messages: [{ message: 'assistant answer' }],
      steps: [{ type: 'tool_call', tool_id: platformCoreTools.search }],
      correctnessAnalysis: { pass: true },
      groundednessAnalysis: { pass: true },
    });
    expect(correctnessEvaluate).toHaveBeenCalledTimes(1);
    expect(groundednessEvaluate).toHaveBeenCalledTimes(1);

    const evaluatorNames = selectedEvaluators.map((e: Evaluator) => e.name);
    expect(evaluatorNames).toContain('Factuality');
    expect(evaluatorNames).toContain('Groundedness');
    expect(evaluatorNames).toContain('Precision@10');
  });

  it('uses search tool for RAG while keeping converse-based evaluators', async () => {
    process.env.RAG_EVAL_EXECUTION_MODE = 'search_tool';
    delete process.env.SELECTED_EVALUATORS;
    delete process.env.RAG_EVAL_K;

    const { evaluators, correctnessEvaluate, groundednessEvaluate } = createMockEvaluators();
    const { executorClient, runExperiment } = createExecutorClient();
    const chatClient = createChatClient();

    chatClient.converse.mockResolvedValue({
      conversationId: 'conversation-id',
      messages: [{ message: 'assistant answer from converse' }],
      errors: [],
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.getDocumentById,
          results: [],
        },
      ],
      traceId: 'trace-id-from-converse',
    });

    chatClient.executeTool.mockResolvedValue({
      results: [
        {
          type: 'resource_list',
          data: {
            resources: [{ reference: { index: 'wix_knowledge_base', id: 'doc-1' } }],
          },
        },
      ],
      errors: [],
    });

    const evaluateDataset = createEvaluateDataset({
      evaluators,
      executorClient,
      chatClient,
      traceEsClient: {} as EsClient,
      log: {} as ToolingLog,
    });

    const example = {
      input: { question: 'Can I use Wix Payments before account verification?' },
      output: {
        expected: 'Yes, with verification required for full activation.',
        groundTruth: {
          wix_knowledge_base: {
            'doc-1': 1,
          },
        },
      },
      metadata: {
        searchIndex: 'wix_knowledge_base',
      },
    };

    await evaluateDataset({
      dataset: {
        name: 'test dataset',
        description: 'dataset description',
        examples: [example],
      },
    });

    const [options, selectedEvaluators] = runExperiment.mock.calls[0];
    const taskOutput = await options.task(example);

    expect(chatClient.executeTool).toHaveBeenCalledTimes(1);
    expect(chatClient.executeTool).toHaveBeenCalledWith({
      toolId: platformCoreTools.search,
      toolParams: {
        query: 'Can I use Wix Payments before account verification?',
        index: 'wix_knowledge_base',
      },
    });
    expect(chatClient.converse).toHaveBeenCalledTimes(1);
    expect(taskOutput).toMatchObject({
      errors: [],
      traceId: 'trace-id-from-converse',
      messages: [{ message: 'assistant answer from converse' }],
      steps: [
        {
          type: 'tool_call',
          tool_id: platformCoreTools.getDocumentById,
        },
      ],
      correctnessAnalysis: { pass: true },
      groundednessAnalysis: { pass: true },
      searchToolResults: [
        {
          type: 'resource_list',
          data: {
            resources: [{ reference: { index: 'wix_knowledge_base', id: 'doc-1' } }],
          },
        },
      ],
    });
    expect(correctnessEvaluate).toHaveBeenCalledTimes(1);
    expect(groundednessEvaluate).toHaveBeenCalledTimes(1);

    const evaluatorNames = selectedEvaluators.map((e: Evaluator) => e.name);
    expect(evaluatorNames).toContain('Factuality');
    expect(evaluatorNames).toContain('Groundedness');
    expect(evaluatorNames).toContain('Precision@10');
  });
});
