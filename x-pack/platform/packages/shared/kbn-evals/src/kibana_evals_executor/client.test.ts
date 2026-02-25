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
jest.mock('../utils/tracing', () => ({
  withTaskSpan: jest.fn((_name: string, _opts: unknown, cb: () => unknown) => cb()),
  withEvaluatorSpan: jest.fn((_name: string, _opts: unknown, cb: () => unknown) => cb()),
  getCurrentTraceId: jest.fn(),
}));

import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { Model } from '@kbn/inference-common';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationDataset, Evaluator, RanExperiment } from '../types';
import { getCurrentTraceId, withEvaluatorSpan, withTaskSpan } from '../utils/tracing';
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
    (getCurrentTraceId as jest.Mock).mockReturnValue('default-trace-id');
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
        })
      );
    });

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

  it('captures and stores trace IDs for tasks and evaluators', async () => {
    const client = createClient();
    const dataset: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [{ input: { q: 1 }, output: { expected: 1 } }],
    };
    const task = async () => ({ value: 1 });
    const evaluators: Array<Evaluator<EvaluationDataset['examples'][number], { value: number }>> = [
      {
        name: 'HasValue',
        kind: 'CODE',
        evaluate: async ({ output }) => ({ score: typeof output?.value === 'number' ? 1 : 0 }),
      },
    ];

    const mockTaskTraceId = 'task-trace-id';
    const mockEvalTraceId = 'evaluator-trace-id';
    (getCurrentTraceId as jest.Mock)
      .mockReturnValueOnce(mockTaskTraceId)
      .mockReturnValueOnce(mockEvalTraceId);

    const exp = await client.runExperiment({ dataset, task }, evaluators);
    const [firstRun] = Object.values(exp.runs);
    expect(firstRun).toBeDefined();
    expect(firstRun.traceId).toBe(mockTaskTraceId);

    expect(exp.evaluationRuns).toHaveLength(1);
    expect(exp.evaluationRuns[0].traceId).toBe(mockEvalTraceId);

    expect(withTaskSpan).toHaveBeenCalled();
    expect(withEvaluatorSpan).toHaveBeenCalled();
    expect(getCurrentTraceId).toHaveBeenCalled();
  });

  it('handles missing trace IDs gracefully', async () => {
    const client = createClient();
    const dataset: EvaluationDataset = {
      name: 'ds',
      description: 'desc',
      examples: [{ input: { q: 1 }, output: { expected: 1 } }],
    };
    const task = async () => ({ value: 1 });
    const evaluators: Array<Evaluator<EvaluationDataset['examples'][number], { value: number }>> = [
      {
        name: 'HasValue',
        kind: 'CODE',
        evaluate: async ({ output }) => ({ score: typeof output?.value === 'number' ? 1 : 0 }),
      },
    ];

    (getCurrentTraceId as jest.Mock).mockReturnValue(null);

    const exp = await client.runExperiment({ dataset, task }, evaluators);
    const runKeys = Object.keys(exp.runs);
    const firstRun = exp.runs[runKeys[0]];
    expect(firstRun.traceId).toBeNull();
    expect(exp.evaluationRuns[0].traceId).toBeNull();
    expect(exp.evaluationRuns.length).toBeGreaterThan(0);
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
});
