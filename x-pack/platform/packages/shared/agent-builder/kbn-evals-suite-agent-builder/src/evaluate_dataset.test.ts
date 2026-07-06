/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  EvalsExecutorClient,
  Evaluator,
  Example,
  TaskOutput,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractSearchRetrievedDocs } from './rag_extractor';
import {
  allowedDomainToolIdsForExample,
  calculateAgentBuilderFactualScore,
  createEvaluateExternalDataset,
} from './evaluate_dataset';
import type { AgentBuilderEvaluationChatClient } from './chat_client';

describe('extractSearchRetrievedDocs', () => {
  it('extracts docs from direct data.reference shape', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          results: [{ data: { reference: { index: 'elastic_knowledge_base', id: '3325_4' } } }],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([
      { index: 'elastic_knowledge_base', id: '3325_4' },
    ]);
  });

  it('extracts docs from resource_list data.resources[].reference shape', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          results: [
            {
              data: {
                resources: [
                  { reference: { index: 'elastic_knowledge_base', id: '3325_1' } },
                  { reference: { index: 'elastic_knowledge_base', id: '3325_3' } },
                ],
              },
            },
          ],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([
      { index: 'elastic_knowledge_base', id: '3325_1' },
      { index: 'elastic_knowledge_base', id: '3325_3' },
    ]);
  });

  it('handles mixed result shapes and ignores malformed references', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          results: [
            {
              data: {
                reference: { index: 'elastic_knowledge_base', id: '7158_1' },
              },
            },
            {
              data: {
                resources: [
                  { reference: { index: 'elastic_knowledge_base', id: '7158_2' } },
                  { reference: { index: 'elastic_knowledge_base' } },
                  { reference: { id: '7158_3' } },
                ],
              },
            },
          ],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([
      { index: 'elastic_knowledge_base', id: '7158_1' },
      { index: 'elastic_knowledge_base', id: '7158_2' },
    ]);
  });

  it('ignores non-search tool calls and non tool_call steps', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.get_document_by_id',
          results: [{ data: { reference: { index: 'elastic_knowledge_base', id: '3325_4' } } }],
        },
        {
          type: 'reasoning',
          tool_id: 'platform.core.search',
          results: [{ data: { reference: { index: 'elastic_knowledge_base', id: '3325_1' } } }],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([]);
  });
});

describe('createEvaluateExternalDataset', () => {
  const originalExecutorType = process.env.KBN_EVALS_EXECUTOR;

  afterEach(() => {
    process.env.KBN_EVALS_EXECUTOR = originalExecutorType;
  });

  function createTraceEvaluator(name: string): Evaluator<Example, unknown> {
    return {
      name,
      kind: 'CODE',
      evaluate: async () => ({ score: 1 }),
    };
  }

  function createDefaultEvaluators(): DefaultEvaluators {
    return {
      criteria: () => ({
        name: 'Criteria',
        kind: 'LLM',
        evaluate: async () => ({ score: 1 }),
      }),
      correctnessAnalysis: () => ({
        name: 'CorrectnessAnalysis',
        kind: 'LLM',
        evaluate: async () => ({ score: 1 }),
      }),
      groundednessAnalysis: () => ({
        name: 'GroundednessAnalysis',
        kind: 'LLM',
        evaluate: async () => ({ score: 1 }),
      }),
      traceBasedEvaluators: {
        inputTokens: createTraceEvaluator('InputTokens'),
        outputTokens: createTraceEvaluator('OutputTokens'),
        latency: createTraceEvaluator('Latency'),
        toolCalls: createTraceEvaluator('ToolCalls'),
        cachedTokens: createTraceEvaluator('CachedTokens'),
      },
    };
  }

  function createTestSetup() {
    const runExperiment = jest.fn(async () => ({}));

    const evaluator = createEvaluateExternalDataset({
      evaluators: createDefaultEvaluators(),
      executorClient: { runExperiment } as unknown as EvalsExecutorClient,
      chatClient: {
        converse: async () => ({ errors: [], messages: [], steps: [] }),
      } as unknown as AgentBuilderEvaluationChatClient,
      traceEsClient: {} as unknown as EsClient,
      log: {
        info: jest.fn(),
        debug: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
      } as unknown as ToolingLog,
    });

    return { evaluator, runExperiment };
  }

  it('uses Elasticsearch external dataset description when executor is not Phoenix', async () => {
    delete process.env.KBN_EVALS_EXECUTOR;
    const { evaluator, runExperiment } = createTestSetup();

    await evaluator('dataset-from-es');

    expect(runExperiment).toHaveBeenCalledTimes(1);
    expect(runExperiment).toHaveBeenCalledWith(
      expect.objectContaining({
        datasets: [
          {
            name: 'dataset-from-es',
            description: 'External dataset resolved from Elasticsearch by name',
            examples: [],
          },
        ],
        trustUpstreamDataset: true,
      }),
      expect.any(Array)
    );
  });

  it('uses Phoenix external dataset description when executor is Phoenix', async () => {
    process.env.KBN_EVALS_EXECUTOR = 'phoenix';
    const { evaluator, runExperiment } = createTestSetup();

    await evaluator('dataset-from-phoenix');

    expect(runExperiment).toHaveBeenCalledTimes(1);
    expect(runExperiment).toHaveBeenCalledWith(
      expect.objectContaining({
        datasets: [
          {
            name: 'dataset-from-phoenix',
            description: 'External dataset resolved from Phoenix by name',
            examples: [],
          },
        ],
        trustUpstreamDataset: true,
      }),
      expect.any(Array)
    );
  });
});

describe('allowedDomainToolIdsForExample', () => {
  it('allows discover_rule_tags + find_rules for find-rules routing metadata', () => {
    expect(
      allowedDomainToolIdsForExample({
        expectedOnlyToolId: 'security.find_rules',
        category: 'find-rules',
      })
    ).toEqual(['security.discover_rule_tags', 'security.find_rules']);
  });

  it('returns a single-tool allowlist for non find-rules examples', () => {
    expect(
      allowedDomainToolIdsForExample({
        expectedOnlyToolId: 'security.create_detection_rule',
        category: 'rule-creation',
      })
    ).toEqual(['security.create_detection_rule']);
  });

  it('returns null when expectedOnlyToolId is absent', () => {
    expect(allowedDomainToolIdsForExample({ category: 'find-rules' })).toBeNull();
  });
});

describe('calculateAgentBuilderFactualScore', () => {
  const buildAnalysis = (
    claims: Array<{ verdict: string; centrality: 'central' | 'peripheral' }>
  ): any => ({
    summary: {
      factual_accuracy_summary: 'ACCURATE',
      relevance_summary: 'RELEVANT',
      sequence_accuracy_summary: 'NOT_APPLICABLE',
    },
    analysis: claims.map((c) => ({
      claim: 'test claim',
      centrality: c.centrality,
      centrality_reason: '',
      verdict: c.verdict,
      sequence_match: 'NOT_APPLICABLE',
      justification_snippet: undefined,
      explanation: '',
    })),
  });

  it('returns 0 for empty analysis', () => {
    expect(calculateAgentBuilderFactualScore(buildAnalysis([]))).toBe(0);
  });

  it('returns 1 when all claims are FULLY_SUPPORTED', () => {
    expect(
      calculateAgentBuilderFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'peripheral' },
        ])
      )
    ).toBe(1);
  });

  it('tanks to 0 for a contradicted central claim (geometric-mean intent preserved)', () => {
    expect(
      calculateAgentBuilderFactualScore(
        buildAnalysis([
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
          { verdict: 'CONTRADICTED', centrality: 'central' },
        ])
      )
    ).toBe(0);
  });

  it('does not penalize extra NOT_IN_GROUND_TRUTH claims when verifiable claims are accurate', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    expect(calculateAgentBuilderFactualScore(analysis)).toBe(1);
  });

  it('reflects verifiable-claim accuracy without dilution from extra claims', () => {
    const analysis = buildAnalysis([
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'FULLY_SUPPORTED', centrality: 'central' },
      { verdict: 'PARTIALLY_SUPPORTED', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    expect(calculateAgentBuilderFactualScore(analysis)).toBeCloseTo(Math.pow(0.9, 1 / 3), 5);
  });

  it('falls back to scoring unverifiable claims when no claim can be checked', () => {
    const analysis = buildAnalysis([
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
      { verdict: 'NOT_IN_GROUND_TRUTH', centrality: 'central' },
    ]);
    expect(calculateAgentBuilderFactualScore(analysis)).toBeCloseTo(0.1, 5);
  });
});
