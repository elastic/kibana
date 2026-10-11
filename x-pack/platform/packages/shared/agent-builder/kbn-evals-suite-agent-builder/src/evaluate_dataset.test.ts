/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  Direction,
  EvalsExecutorClient,
  Evaluator,
  Example,
  TaskOutput,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractSearchRetrievedDocs } from './ir_extractor';
import { createEvaluateDataset, createEvaluateExternalDataset } from './evaluate_dataset';
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

function createTraceEvaluator(
  name: string,
  direction: Direction = 'maximize'
): Evaluator<Example, unknown> {
  return {
    name,
    kind: 'CODE',
    direction,
    evaluate: async () => ({ score: 1 }),
  };
}

function createDefaultEvaluators(): DefaultEvaluators {
  return {
    criteria: () => ({
      name: 'Criteria',
      kind: 'LLM',
      direction: 'maximize',
      evaluate: async () => ({ score: 1 }),
    }),
    correctnessAnalysis: () => ({
      name: 'CorrectnessAnalysis',
      kind: 'LLM',
      direction: 'maximize',
      evaluate: async () => ({ score: 1 }),
    }),
    groundednessAnalysis: () => ({
      name: 'GroundednessAnalysis',
      kind: 'LLM',
      direction: 'maximize',
      evaluate: async () => ({ score: 1 }),
    }),
    traceBasedEvaluators: {
      inputTokens: createTraceEvaluator('InputTokens', 'minimize'),
      outputTokens: createTraceEvaluator('OutputTokens', 'minimize'),
      latency: createTraceEvaluator('Latency', 'minimize'),
      toolCalls: createTraceEvaluator('ToolCalls', 'minimize'),
      cachedTokens: createTraceEvaluator('CachedTokens', 'minimize'),
    },
  };
}

function createTestSetup() {
  const runExperiment = jest.fn(async (config: unknown, selectedEvaluators: Evaluator[]) => ({
    selectedEvaluators,
  }));

  const dependencies = {
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
  };

  return { dependencies, runExperiment };
}

describe('createEvaluateExternalDataset', () => {
  it('passes dataset name and Elasticsearch description to runExperiment', async () => {
    const { dependencies, runExperiment } = createTestSetup();

    await createEvaluateExternalDataset(dependencies)('my-dataset');

    expect(runExperiment).toHaveBeenCalledTimes(1);
    expect(runExperiment).toHaveBeenCalledWith(
      expect.objectContaining({
        datasets: [
          {
            name: 'my-dataset',
            description: 'External dataset resolved from Elasticsearch by name',
            examples: [],
          },
        ],
        trustUpstreamDataset: true,
      }),
      expect.any(Array)
    );
  });
});

describe('ExpectedSkillInvocation evaluator', () => {
  const loadedSkill = 'automatic-migration-rules-summarize';
  const notLoadedSkill = 'automatic-migration-rules-start-migration';

  // Mirrors an agent-builder round where `load_skill` reports the skill it resolved. Invocation
  // evidence has to live in `results`, since getToolCallSteps only forwards `tool_id`/`results`.
  const output = {
    messages: [],
    errors: [],
    steps: [
      {
        type: 'tool_call',
        tool_id: 'load_skill',
        results: [
          {
            data: {
              skill: {
                id: loadedSkill,
                name: loadedSkill,
                path: `/skills/security/siem_migrations/${loadedSkill}/SKILL.md`,
              },
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: 'security.siem_migration.get_all_rule_migration_stats',
        results: [{ data: { total: 3 } }],
      },
    ],
  } satisfies TaskOutput;

  async function evaluateSkillInvocation(metadata: Record<string, unknown>) {
    const { dependencies, runExperiment } = createTestSetup();

    await createEvaluateDataset(dependencies)({
      dataset: {
        name: 'test-dataset',
        description: 'dataset for ExpectedSkillInvocation evaluator tests',
        examples: [{ input: { question: 'Rule Migrations' }, output: {} }],
      },
    });

    const [, selectedEvaluators] = runExperiment.mock.calls[0];
    const evaluator = selectedEvaluators.find((it) => it.name === 'ExpectedSkillInvocation');
    if (!evaluator) {
      throw new Error('ExpectedSkillInvocation evaluator was not registered');
    }

    return evaluator.evaluate({
      input: { question: 'Rule Migrations' },
      expected: {},
      output,
      metadata,
    });
  }

  it('returns score 0 when shouldNotActivateSkill is loaded', async () => {
    const result = await evaluateSkillInvocation({ shouldNotActivateSkill: loadedSkill });

    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        shouldNotActivateSkill: loadedSkill,
        invoked: true,
        loadedNames: expect.arrayContaining([loadedSkill]),
      })
    );
  });

  it('returns score 1 when shouldNotActivateSkill is not loaded', async () => {
    const result = await evaluateSkillInvocation({ shouldNotActivateSkill: notLoadedSkill });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        shouldNotActivateSkill: notLoadedSkill,
        invoked: false,
        loadedNames: expect.arrayContaining([loadedSkill]),
      })
    );
  });

  it('returns error label for invalid shouldNotActivateSkill', async () => {
    const result = await evaluateSkillInvocation({ shouldNotActivateSkill: 'invalid skill name' });

    expect(result.score).toBeNull();
    expect(result.label).toBe('error');
    expect(result.explanation).toContain('Invalid skill name');
  });

  it('prioritizes expectedSkill when both expectedSkill and shouldNotActivateSkill are provided', async () => {
    const result = await evaluateSkillInvocation({
      expectedSkill: loadedSkill,
      shouldNotActivateSkill: loadedSkill,
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual({
      expectedSkill: loadedSkill,
      invoked: true,
      loadedNames: [loadedSkill, `/skills/security/siem_migrations/${loadedSkill}/SKILL.md`],
    });
  });
});

describe('metadata-opt-in evaluators return N/A when their key is unset', () => {
  const finalAnswer = {
    messages: [{ message: 'Version 8.15.0 was released on 2024-08-06.' }],
    errors: [],
    steps: [{ type: 'tool_call', tool_id: 'platform.core.search', results: [{ data: {} }] }],
  } satisfies TaskOutput;

  async function evaluateByName(name: string, metadata: Record<string, unknown> | undefined) {
    const { dependencies, runExperiment } = createTestSetup();

    await createEvaluateDataset(dependencies)({
      dataset: {
        name: 'test-dataset',
        description: 'dataset for N/A evaluator tests',
        examples: [{ input: { question: 'q' }, output: {} }],
      },
    });

    const [, selectedEvaluators] = runExperiment.mock.calls[0];
    const evaluator = selectedEvaluators.find((it) => it.name === name);
    if (!evaluator) {
      throw new Error(`${name} evaluator was not registered`);
    }

    return evaluator.evaluate({
      input: { question: 'q' },
      expected: {},
      output: finalAnswer,
      metadata,
    });
  }

  const nAMetadataOptInCases: Array<[string, Record<string, unknown> | undefined]> = [
    ['ExpectedToolCalled', undefined],
    ['ExpectedToolCalled', {}],
    ['ShouldNotCallTool', {}],
    ['ToolUsageOnly', {}],
    ['RequiredTermsInResponse', {}],
    ['RequiredTermsInResponse', { requiredTerms: [] }],
    ['RequiredAlertIdsInResponse', { requiredAlertIds: [] }],
    ['RequiredAlertIdsInResponse', { requiredAlertIds: [42] }],
    ['DocVersionReleaseDate', {}],
    ['DocVersionReleaseDate', { requireVersionAndReleaseDate: false }],
    ['ExpectedSkillInvocation', {}],
  ];

  it.each(nAMetadataOptInCases)(
    '%s returns score null with unavailable label when its metadata key is unset',
    async (name, metadata) => {
      const result = await evaluateByName(name, metadata);

      expect(result.score).toBeNull();
      expect(result.score).not.toBe(1);
      expect(result.score).not.toBe(0);
      expect(result.label).toBe('unavailable');
      expect(result.metadata).toEqual(
        expect.objectContaining({ reason: expect.stringContaining('not set') })
      );
    }
  );

  it('ExpectedToolCalled still scores 1 when expectedToolId is set and the tool was called', async () => {
    const result = await evaluateByName('ExpectedToolCalled', {
      expectedToolId: 'platform.core.search',
    });

    expect(result.score).toBe(1);
  });

  it('RequiredTermsInResponse still scores 1 when requiredTerms match the answer', async () => {
    const result = await evaluateByName('RequiredTermsInResponse', {
      requiredTerms: ['8.15.0'],
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toEqual(
      expect.objectContaining({ missing: [], requiredTerms: ['8.15.0'] })
    );
  });

  it('RequiredTermsInResponse still scores 0 when requiredTerms are missing from the answer', async () => {
    const result = await evaluateByName('RequiredTermsInResponse', {
      requiredTerms: ['9.9.9'],
    });

    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(expect.objectContaining({ missing: ['9.9.9'] }));
  });

  it('ShouldNotCallTool still scores 1 when the tool was not called', async () => {
    const result = await evaluateByName('ShouldNotCallTool', {
      shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
    });

    expect(result.score).toBe(1);
  });

  it('ShouldNotCallTool still scores 0 when the tool was called', async () => {
    const result = await evaluateByName('ShouldNotCallTool', {
      shouldNotCallToolId: 'platform.core.search',
    });

    expect(result.score).toBe(0);
  });
});
