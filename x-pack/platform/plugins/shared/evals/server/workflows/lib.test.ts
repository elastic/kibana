/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVALS_EVALUATE_URL, EVALS_SCORES_URL } from '@kbn/evals-common';
import type { EvalsTaskProvider, TaskProviderRegistry } from '../task_providers/types';
import {
  evaluateWorkBatch,
  normalizeReferenceData,
  runExampleEvaluation,
  type DatasetEvaluationConfig,
  type DatasetWorkItem,
  type EvaluateExampleParams,
  type StepRuntime,
} from './lib';

const VALID_TRACE_ID = 'a'.repeat(32);

interface RecordedCall {
  path: string;
  body: any;
}

const createRegistry = (
  run: EvalsTaskProvider['run'] = async () => ({
    output: { content: 'Paris' },
    traceId: VALID_TRACE_ID,
  })
): TaskProviderRegistry => {
  const provider: EvalsTaskProvider = { name: 'inference', run };
  return {
    register: jest.fn(),
    get: (name) => (name === 'inference' ? provider : undefined),
    has: (name) => name === 'inference',
    list: () => [provider],
  };
};

const createRuntime = (recorded: RecordedCall[], spaceId = 'default'): StepRuntime => {
  const callKibanaApi = (async ({ path, body }: { path: string; body?: unknown }) => {
    recorded.push({ path, body });
    if (path === EVALS_EVALUATE_URL) {
      return { status: 200, headers: {}, body: { results: [] } };
    }
    if (path === EVALS_SCORES_URL) {
      return { status: 200, headers: {}, body: { ingested: 0, conflicted: 0, failed: [] } };
    }
    throw new Error(`Unexpected path: ${path}`);
  }) as unknown as StepRuntime['callKibanaApi'];

  return {
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    getInferenceClient: jest.fn() as unknown as StepRuntime['getInferenceClient'],
    callKibanaApi,
    spaceId,
    resolveModel: (async (connectorId: string) => ({
      id: connectorId,
    })) as StepRuntime['resolveModel'],
  };
};

const baseParams = (overrides: Partial<EvaluateExampleParams> = {}): EvaluateExampleParams => ({
  experimentId: 'exp-1',
  taskModel: { id: 'conn-1' },
  evaluatorModel: { id: 'conn-1' },
  target: { connectorId: 'conn-1' },
  dataset: { id: 'ds-1', name: 'ds' },
  example: { id: 'ex-1', index: 0, input: { prompt: 'Q' }, output: { expected: 'Paris' } },
  evaluators: [{ name: 'correctness', connector_id: 'conn-1' }],
  repetitions: 1,
  ...overrides,
});

/** Returns the single trace object sent to the `/_evaluate` endpoint. */
const evaluatedTrace = (recorded: RecordedCall[]) => {
  const call = recorded.find((c) => c.path === EVALS_EVALUATE_URL);
  return call?.body?.subject?.traces?.[0];
};

/** Returns the body sent to the `/scores` (ingest) endpoint. */
const ingestedScoresBody = (recorded: RecordedCall[]) =>
  recorded.find((c) => c.path === EVALS_SCORES_URL)?.body;

describe('normalizeReferenceData', () => {
  it('passes plain objects through unchanged', () => {
    expect(normalizeReferenceData({ expected: 'Paris' })).toEqual({ expected: 'Paris' });
  });

  it('returns undefined for missing, primitive, or array values', () => {
    expect(normalizeReferenceData(undefined)).toBeUndefined();
    expect(normalizeReferenceData(null)).toBeUndefined();
    expect(normalizeReferenceData('Paris')).toBeUndefined();
    expect(normalizeReferenceData(42)).toBeUndefined();
    expect(normalizeReferenceData(['Paris'])).toBeUndefined();
  });
});

describe('runExampleEvaluation reference data', () => {
  it("forwards the example's output as reference_data", async () => {
    const recorded: RecordedCall[] = [];
    await runExampleEvaluation(createRegistry(), createRuntime(recorded), baseParams());

    expect(evaluatedTrace(recorded).reference_data).toEqual({ expected: 'Paris' });
  });

  it('prefers an explicit referenceData over the example output', async () => {
    const recorded: RecordedCall[] = [];
    await runExampleEvaluation(
      createRegistry(),
      createRuntime(recorded),
      baseParams({
        referenceData: { expected: 'override' },
        example: { id: 'ex-1', index: 0, input: { prompt: 'Q' }, output: { expected: 'ignored' } },
      })
    );

    expect(evaluatedTrace(recorded).reference_data).toEqual({ expected: 'override' });
  });

  it('omits reference_data when the example has no object output', async () => {
    const recorded: RecordedCall[] = [];
    await runExampleEvaluation(
      createRegistry(),
      createRuntime(recorded),
      baseParams({ example: { id: 'ex-1', index: 0, input: { prompt: 'Q' } } })
    );

    const trace = evaluatedTrace(recorded);
    expect(trace.reference_data).toBeUndefined();
    expect('reference_data' in trace).toBe(false);
  });
});

describe('runExampleEvaluation failure capture', () => {
  it('captures a failure message and counts the failed repetition', async () => {
    const recorded: RecordedCall[] = [];
    const registry = createRegistry(async () => {
      throw new Error('task exploded');
    });

    const result = await runExampleEvaluation(registry, createRuntime(recorded), baseParams());

    expect(result.failed).toBe(1);
    expect(result.scoresIngested).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('ex-1');
    expect(result.errors[0]).toContain('task exploded');
  });

  it('returns no errors on a fully successful example', async () => {
    const recorded: RecordedCall[] = [];

    const result = await runExampleEvaluation(
      createRegistry(),
      createRuntime(recorded),
      baseParams()
    );

    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('surfaces evaluator-level failures while still ingesting successful scores', async () => {
    const recorded: RecordedCall[] = [];
    // The /_evaluate call succeeds overall, but one evaluator reports status 'error'.
    const runtime: StepRuntime = {
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      abortSignal: new AbortController().signal,
      getInferenceClient: jest.fn() as unknown as StepRuntime['getInferenceClient'],
      spaceId: 'default',
      resolveModel: (async (connectorId: string) => ({
        id: connectorId,
      })) as StepRuntime['resolveModel'],
      callKibanaApi: (async ({ path, body }: { path: string; body?: unknown }) => {
        recorded.push({ path, body });
        if (path === EVALS_EVALUATE_URL) {
          return {
            status: 200,
            headers: {},
            body: {
              results: [
                {
                  status: 'ok',
                  evaluator: { name: 'input_tokens', version: '1', kind: 'code' },
                  scores: [{ name: 'input_tokens', score: 42 }],
                },
                {
                  status: 'error',
                  evaluator: { name: 'correctness', version: '1', kind: 'llm' },
                  error: { message: 'reference_data is required' },
                },
              ],
            },
          };
        }
        if (path === EVALS_SCORES_URL) {
          return { status: 200, headers: {}, body: { ingested: 1, conflicted: 0, failed: [] } };
        }
        throw new Error(`Unexpected path: ${path}`);
      }) as unknown as StepRuntime['callKibanaApi'],
    };

    const result = await runExampleEvaluation(createRegistry(), runtime, baseParams());

    // The example is not counted as failed (the trace was graded and scores were ingested)...
    expect(result.failed).toBe(0);
    expect(result.scoresIngested).toBe(1);
    // ...but the broken evaluator is still surfaced.
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('correctness');
    expect(result.errors[0]).toContain('reference_data is required');
  });
});

describe('evaluateWorkBatch reference data', () => {
  it("forwards each example's output as reference_data (workflow batch path)", async () => {
    const recorded: RecordedCall[] = [];
    const config: DatasetEvaluationConfig = {
      experimentId: 'exp-1',
      taskModel: { id: 'conn-1' },
      evaluatorModel: { id: 'conn-1' },
      target: { connectorId: 'conn-1' },
      evaluators: [{ name: 'correctness', connector_id: 'conn-1' }],
      repetitions: 1,
    };
    const batch: DatasetWorkItem[] = [
      {
        dataset: { id: 'ds-1', name: 'ds' },
        example: { id: 'ex-1', index: 0, input: { prompt: 'Q' }, output: { expected: 'Paris' } },
      },
    ];

    const result = await evaluateWorkBatch(
      createRegistry(),
      createRuntime(recorded),
      config,
      batch,
      1
    );

    expect(result.failed).toBe(0);
    expect(evaluatedTrace(recorded).reference_data).toEqual({ expected: 'Paris' });
  });

  it("stamps ingested scores with the workflow's space so in-tool runs stay space-scoped", async () => {
    const recorded: RecordedCall[] = [];

    const result = await runExampleEvaluation(
      createRegistry(),
      createRuntime(recorded, 'marketing'),
      baseParams()
    );

    expect(result.failed).toBe(0);
    expect(ingestedScoresBody(recorded)?.space_ids).toEqual(['marketing']);
  });

  it('assigns explicit space_ids from the config, overriding the workflow space', async () => {
    const recorded: RecordedCall[] = [];

    const result = await runExampleEvaluation(
      createRegistry(),
      createRuntime(recorded, 'marketing'),
      baseParams({ spaceIds: ['sales', 'support'] })
    );

    expect(result.failed).toBe(0);
    // An experiment that explicitly targets spaces wins over the execution space.
    expect(ingestedScoresBody(recorded)?.space_ids).toEqual(['sales', 'support']);
  });

  it('aggregates failure messages across the batch', async () => {
    const recorded: RecordedCall[] = [];
    const registry = createRegistry(async () => {
      throw new Error('nope');
    });
    const config: DatasetEvaluationConfig = {
      experimentId: 'exp-1',
      taskModel: { id: 'conn-1' },
      evaluatorModel: { id: 'conn-1' },
      target: { connectorId: 'conn-1' },
      evaluators: [{ name: 'correctness', connector_id: 'conn-1' }],
      repetitions: 1,
    };
    const batch: DatasetWorkItem[] = [
      { dataset: { id: 'ds-1', name: 'ds' }, example: { id: 'ex-1', index: 0, input: {} } },
      { dataset: { id: 'ds-1', name: 'ds' }, example: { id: 'ex-2', index: 1, input: {} } },
    ];

    const result = await evaluateWorkBatch(registry, createRuntime(recorded), config, batch, 2);

    expect(result.completed).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.join('\n')).toContain('ex-1');
    expect(result.errors.join('\n')).toContain('ex-2');
  });

  it('returns a cancelled result with partial counts instead of throwing on abort', async () => {
    const recorded: RecordedCall[] = [];
    const controller = new AbortController();
    let runs = 0;
    const registry = createRegistry(async () => {
      runs += 1;
      // Cancel once the first example is in flight; it still finishes, but the
      // next one must not be started.
      controller.abort();
      return { output: { content: 'Paris' }, traceId: VALID_TRACE_ID };
    });
    const runtime: StepRuntime = { ...createRuntime(recorded), abortSignal: controller.signal };
    const config: DatasetEvaluationConfig = {
      experimentId: 'exp-1',
      taskModel: { id: 'conn-1' },
      evaluatorModel: { id: 'conn-1' },
      target: { connectorId: 'conn-1' },
      evaluators: [{ name: 'correctness', connector_id: 'conn-1' }],
      repetitions: 1,
    };
    const batch: DatasetWorkItem[] = [
      { dataset: { id: 'ds-1', name: 'ds' }, example: { id: 'ex-1', index: 0, input: {} } },
      { dataset: { id: 'ds-1', name: 'ds' }, example: { id: 'ex-2', index: 1, input: {} } },
    ];

    const result = await evaluateWorkBatch(registry, runtime, config, batch, 1);

    expect(result.cancelled).toBe(true);
    // ex-1 finished before the abort; ex-2 was never started.
    expect(result.completed).toBe(1);
    expect(runs).toBe(1);
  });
});
