/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/inference-tracing', () => ({
  // Avoid initializing tracing in unit tests (can keep Jest alive).
  withInferenceContext: (fn: () => unknown) => fn(),
}));

import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { Model } from '@kbn/inference-common';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type {
  EvaluationDataset,
  Evaluator,
  RanExperiment,
  ImprovementSuggestionAnalysisResult,
} from '../types';
import type { ImprovementSuggestionsService } from '../utils/improvement_suggestions';
import { KibanaEvalsClient } from './client';

describe('KibanaEvalsClient', () => {
  const mockLog: jest.Mocked<SomeDevLog> = {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as any;

  const model: Model = {
    id: 'gpt-4',
    family: ModelFamily.GPT,
    provider: ModelProvider.OpenAI,
  };

  const createClient = (overrides?: Partial<ConstructorParameters<typeof KibanaEvalsClient>[0]>) =>
    new KibanaEvalsClient({
      log: mockLog,
      model,
      runId: 'run-1',
      repetitions: 1,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes a stable datasetId across equivalent datasets', async () => {
    const client = createClient();

    const datasetA: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [
        // undefined output should normalize to null for datasetId hashing
        { input: { q: 1 }, metadata: {} },
        { input: { q: 2 }, output: { a: 2 } },
      ],
    };

    const datasetB: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [
        { input: { q: 1 }, output: null, metadata: { empty: {} } },
        { input: { q: 2 }, output: { a: 2 }, metadata: null },
      ],
    };

    const expA = await client.runExperiment(
      { dataset: datasetA, task: async () => ({ ok: true }) },
      []
    );
    const expB = await client.runExperiment(
      { dataset: datasetB, task: async () => ({ ok: true }) },
      []
    );

    expect(expA.datasetId).toBe(expB.datasetId);
  });

  it('changes datasetId when dataset content changes', async () => {
    const client = createClient();

    const base: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [{ input: { q: 1 }, output: { a: 1 } }],
    };

    const exp1 = await client.runExperiment(
      { dataset: base, task: async () => ({ ok: true }) },
      []
    );
    const exp2 = await client.runExperiment(
      {
        dataset: { ...base, examples: [{ input: { q: 2 }, output: { a: 1 } }] },
        task: async () => ({ ok: true }),
      },
      []
    );

    expect(exp1.datasetId).not.toBe(exp2.datasetId);
  });

  it('respects repetitions and produces expected RanExperiment shape', async () => {
    const client = createClient({ repetitions: 2 });

    const dataset: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [
        { input: { q: 1 }, output: { expected: 1 } },
        { input: { q: 2 }, output: { expected: 2 } },
      ],
    };

    let taskCalls = 0;
    const task = async () => {
      taskCalls++;
      return { value: taskCalls };
    };

    const evaluators: Array<Evaluator<EvaluationDataset['examples'][number], { value: number }>> = [
      {
        name: 'AlwaysOne',
        kind: 'CODE',
        evaluate: async () => ({ score: 1 }),
      },
      {
        name: 'HasValue',
        kind: 'CODE',
        evaluate: async ({ output }) => ({ score: typeof output?.value === 'number' ? 1 : 0 }),
      },
    ];

    const exp = await client.runExperiment({ dataset, task, metadata: { foo: 'bar' } }, evaluators);

    expect(taskCalls).toBe(4); // 2 examples * 2 repetitions
    expect(exp.datasetName).toBe('ds');
    expect(exp.datasetDescription).toBe('desc');
    expect(typeof exp.id).toBe('string');
    expect(exp.id.length).toBeGreaterThan(0);

    const runEntries = Object.values(exp.runs);
    expect(runEntries).toHaveLength(4);
    expect(runEntries.map((r) => r.exampleIndex).sort()).toEqual([0, 0, 1, 1]);
    expect(runEntries.map((r) => r.repetition).sort()).toEqual([0, 0, 1, 1]);
    runEntries.forEach((run) => {
      expect(run).toEqual(
        expect.objectContaining({
          input: expect.any(Object),
          output: expect.any(Object),
          evalThreadId: expect.any(String),
        })
      );
      // Verify evalThreadId is a valid UUID format
      expect(run.evalThreadId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    // Verify each evalThreadId is unique
    const evalThreadIds = runEntries.map((r) => r.evalThreadId);
    expect(new Set(evalThreadIds).size).toBe(evalThreadIds.length);

    expect(exp.evaluationRuns).toHaveLength(4 * evaluators.length);
    expect(exp.evaluationRuns.map((r) => r.name).sort()).toEqual([
      'AlwaysOne',
      'AlwaysOne',
      'AlwaysOne',
      'AlwaysOne',
      'HasValue',
      'HasValue',
      'HasValue',
      'HasValue',
    ]);

    expect(exp.experimentMetadata).toMatchObject({
      foo: 'bar',
      model,
      runId: 'run-1',
    });

    const all = await client.getRanExperiments();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(exp.id);
  });

  it('limits concurrent task execution using the concurrency option', async () => {
    const client = createClient();

    const dataset: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [
        { input: { i: 1 } },
        { input: { i: 2 } },
        { input: { i: 3 } },
        { input: { i: 4 } },
      ],
    };

    let inFlight = 0;
    let maxInFlight = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const task = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await gate;
      inFlight--;
      return { ok: true };
    };

    const promise: Promise<RanExperiment> = client.runExperiment(
      { dataset, task, concurrency: 2 },
      []
    );

    // Wait until the limiter allows 2 tasks to start (and then blocks).
    for (let i = 0; i < 200; i++) {
      if (inFlight === 2) break;
      await new Promise((r) => setTimeout(r, 5));
    }

    expect(inFlight).toBe(2);
    expect(maxInFlight).toBe(2);

    release();
    await promise;

    expect(maxInFlight).toBe(2);
  });

  describe('ImprovementSuggestionsService integration', () => {
    const createMockSuggestionsService = (
      analyzeResult?: ImprovementSuggestionAnalysisResult
    ): jest.Mocked<ImprovementSuggestionsService> => {
      const defaultResult: ImprovementSuggestionAnalysisResult = {
        suggestions: [
          {
            id: 'suggestion-1',
            category: 'prompt',
            impact: 'high',
            confidence: 'high',
            title: 'Improve system prompt clarity',
            description: 'The system prompt could be more specific.',
            evidence: [],
          },
        ],
        summary: {
          totalSuggestions: 1,
          byImpact: { high: 1, medium: 0, low: 0 },
          byCategory: {
            prompt: 1,
            tool_selection: 0,
            response_quality: 0,
            context_retrieval: 0,
            reasoning: 0,
            accuracy: 0,
            efficiency: 0,
            other: 0,
          },
          topPriority: [],
        },
        metadata: {
          runId: 'run-1',
          datasetName: 'ds',
          model: 'gpt-4',
          analyzedAt: new Date().toISOString(),
        },
      };

      return {
        analyzer: {} as any,
        tracePreprocessor: null,
        fetchTrace: jest.fn(),
        fetchTraces: jest.fn(),
        analyze: jest.fn().mockResolvedValue(analyzeResult ?? defaultResult),
        analyzeHeuristic: jest.fn(),
        analyzeLlm: jest.fn(),
        analyzeMultiple: jest.fn(),
        mergeResults: jest.fn(),
      };
    };

    it('reports when no improvement suggestions service is configured', () => {
      const client = createClient();
      expect(client.hasImprovementSuggestionsService()).toBe(false);
      expect(client.getImprovementSuggestionsService()).toBeUndefined();
    });

    it('reports when improvement suggestions service is configured', () => {
      const mockService = createMockSuggestionsService();
      const client = createClient({ improvementSuggestionsService: mockService });
      expect(client.hasImprovementSuggestionsService()).toBe(true);
      expect(client.getImprovementSuggestionsService()).toBe(mockService);
    });

    it('throws error when generateImprovementSuggestions is called without service', async () => {
      const client = createClient();
      const dataset: EvaluationDataset = {
        name: 'ds',
        description: 'desc',
        examples: [{ input: { q: 1 } }],
      };

      const experiment = await client.runExperiment(
        { dataset, task: async () => ({ ok: true }) },
        []
      );

      await expect(client.generateImprovementSuggestions({ experiment })).rejects.toThrow(
        'Improvement suggestions require an ImprovementSuggestionsService'
      );
    });

    it('throws error when runExperimentWithSuggestions is called without service', async () => {
      const client = createClient();
      const dataset: EvaluationDataset = {
        name: 'ds',
        description: 'desc',
        examples: [{ input: { q: 1 } }],
      };

      await expect(
        client.runExperimentWithSuggestions({ dataset, task: async () => ({ ok: true }) }, [])
      ).rejects.toThrow('runExperimentWithSuggestions requires an ImprovementSuggestionsService');
    });

    it('generates improvement suggestions for a completed experiment', async () => {
      const mockService = createMockSuggestionsService();
      const client = createClient({ improvementSuggestionsService: mockService });

      const dataset: EvaluationDataset = {
        name: 'ds',
        description: 'desc',
        examples: [{ input: { q: 1 } }],
      };

      const experiment = await client.runExperiment(
        { dataset, task: async () => ({ result: 'ok' }) },
        []
      );

      const suggestions = await client.generateImprovementSuggestions({
        experiment,
        additionalContext: 'Test context',
        focusCategories: ['prompt', 'accuracy'],
      });

      expect(mockService.analyze).toHaveBeenCalledWith({
        experiment,
        model: 'gpt-4',
        additionalContext: 'Test context',
        focusCategories: ['prompt', 'accuracy'],
      });
      expect(suggestions.suggestions).toHaveLength(1);
      expect(suggestions.suggestions[0].category).toBe('prompt');
    });

    it('runs experiment and generates suggestions in a single call', async () => {
      const mockService = createMockSuggestionsService();
      const client = createClient({ improvementSuggestionsService: mockService });

      const dataset: EvaluationDataset = {
        name: 'ds',
        description: 'desc',
        examples: [
          { input: { q: 1 }, output: { expected: 1 } },
          { input: { q: 2 }, output: { expected: 2 } },
        ],
      };

      const evaluators: Array<Evaluator<EvaluationDataset['examples'][number], { value: number }>> =
        [
          {
            name: 'AlwaysOne',
            kind: 'CODE',
            evaluate: async () => ({ score: 1 }),
          },
        ];

      const { experiment, suggestions } = await client.runExperimentWithSuggestions(
        {
          dataset,
          task: async () => ({ value: 42 }),
          additionalContext: 'Combined workflow test',
          focusCategories: ['tool_selection'],
        },
        evaluators
      );

      // Verify experiment was run
      expect(experiment.datasetName).toBe('ds');
      expect(Object.keys(experiment.runs)).toHaveLength(2);
      expect(experiment.evaluationRuns).toHaveLength(2);

      // Verify suggestions were generated
      expect(mockService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          experiment,
          additionalContext: 'Combined workflow test',
          focusCategories: ['tool_selection'],
        })
      );
      expect(suggestions.suggestions).toHaveLength(1);
    });

    it('uses client model ID when no model is specified in options', async () => {
      const mockService = createMockSuggestionsService();
      const client = createClient({ improvementSuggestionsService: mockService });

      const dataset: EvaluationDataset = {
        name: 'ds',
        description: 'desc',
        examples: [{ input: { q: 1 } }],
      };

      const experiment = await client.runExperiment(
        { dataset, task: async () => ({ ok: true }) },
        []
      );

      await client.generateImprovementSuggestions({ experiment });

      expect(mockService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4', // From the model config in createClient
        })
      );
    });

    it('allows overriding model in generateImprovementSuggestions', async () => {
      const mockService = createMockSuggestionsService();
      const client = createClient({ improvementSuggestionsService: mockService });

      const dataset: EvaluationDataset = {
        name: 'ds',
        description: 'desc',
        examples: [{ input: { q: 1 } }],
      };

      const experiment = await client.runExperiment(
        { dataset, task: async () => ({ ok: true }) },
        []
      );

      await client.generateImprovementSuggestions({
        experiment,
        model: 'claude-3-opus',
      });

      expect(mockService.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus',
        })
      );
    });
  });
});
