/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';
import {
  countRepetitions,
  exampleScoresByEvaluator,
  queryMatrixTraces,
} from './query_matrix_traces';

const doc = (evaluatorName: string | undefined, score: number | null): EvaluationScoreDocument =>
  ({
    evaluator: { name: evaluatorName, score },
  } as EvaluationScoreDocument);

describe('exampleScoresByEvaluator', () => {
  it('means scores per evaluator across repetitions', () => {
    const result = exampleScoresByEvaluator([
      doc('ExpectedToolCalled', 0.8),
      doc('ExpectedToolCalled', 1),
      doc('Correctness', 0.5),
    ]);
    expect(result).toEqual({ ExpectedToolCalled: 0.9, Correctness: 0.5 });
  });

  it('skips documents without an evaluator name or a numeric score', () => {
    const result = exampleScoresByEvaluator([
      doc('ExpectedToolCalled', 0.8),
      doc('ExpectedToolCalled', null),
      doc(undefined, 0.4),
    ]);
    expect(result).toEqual({ ExpectedToolCalled: 0.8 });
  });

  it('returns an empty map when nothing is scorable', () => {
    expect(exampleScoresByEvaluator([doc('ExpectedToolCalled', null)])).toEqual({});
    expect(exampleScoresByEvaluator([])).toEqual({});
  });
});

describe('countRepetitions', () => {
  const repDoc = (repetitionIndex: number | undefined): EvaluationScoreDocument =>
    ({ task: { repetition_index: repetitionIndex } } as EvaluationScoreDocument);

  it('counts distinct repetition indices', () => {
    expect(countRepetitions([repDoc(0), repDoc(0), repDoc(1), repDoc(2)])).toBe(3);
  });

  it('treats a missing index as repetition 0', () => {
    expect(countRepetitions([repDoc(undefined), repDoc(0)])).toBe(1);
  });
});

describe('queryMatrixTraces example fetching', () => {
  const completeDoc = (executionId: string): EvaluationScoreDocument =>
    ({
      example: { id: 'example-1' },
      evaluator: { name: 'Correctness', score: 1 },
      metadata: { execution_id: executionId },
      task: {
        model: { id: 'model-x' },
        output: { messages: [{ message: 'done' }] },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument);

  const makeClient = (opts: { filtered: boolean }) => {
    const getExampleScores = jest.fn(
      async (_exampleId: string, filters?: { executionId?: string }) =>
        // A server that knows the filters returns only that execution; an old
        // server ignores them and returns every execution mixed together.
        opts.filtered
          ? [completeDoc(filters?.executionId ?? 'exec-a')]
          : [completeDoc('exec-a'), completeDoc('exec-b')]
    );
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores,
    };
    return client;
  };

  const aggregatedFor = (experimentId: string) => [
    {
      modelId: 'model-x',
      suites: [{ suiteId: 'suite-1', experimentId, datasets: [], evaluators: [] }],
    },
  ];

  const logStub = {
    debug: jest.fn(),
    warning: jest.fn(),
  };

  it('passes the execution filter to the example-scores route', async () => {
    const client = makeClient({ filtered: true });
    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor('exec-a') as never
    );
    expect(client.getExampleScores).toHaveBeenCalledWith('example-1', {
      executionId: 'exec-a',
      modelId: 'model-x',
    });
    expect(Object.keys(traces)).toContain('model-x:example-1');
  });

  it('detects an unfiltered (legacy) server and reuses the shared fetch across runs', async () => {
    const client = makeClient({ filtered: false });
    await queryMatrixTraces(
      client as never,
      logStub as never,
      [...aggregatedFor('exec-a'), ...aggregatedFor('exec-b')] as never
    );
    // Second run for the same example reuses the first fetch instead of
    // re-downloading the full unfiltered payload.
    expect(client.getExampleScores).toHaveBeenCalledTimes(1);
  });

  it('fetches once per example on a legacy server even with many runs', async () => {
    const client = makeClient({ filtered: false });
    const aggregated = Array.from({ length: 6 }, (_, i) => aggregatedFor(`exec-${i}`)).flat();
    await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    expect(client.getExampleScores).toHaveBeenCalledTimes(1);
  });

  it('fetches each (run, example) pair on a filtered server with no cross-run aliasing', async () => {
    const client = makeClient({ filtered: true });
    await queryMatrixTraces(
      client as never,
      logStub as never,
      [...aggregatedFor('exec-a'), ...aggregatedFor('exec-b')] as never
    );
    expect(client.getExampleScores).toHaveBeenCalledTimes(2);
    const executions = client.getExampleScores.mock.calls.map(([, f]) => f?.executionId).sort();
    expect(executions).toEqual(['exec-a', 'exec-b']);
  });

  it('bounds example-fetch concurrency and overlaps work across runs', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const getExampleScores = jest.fn(
      async (_exampleId: string, filters?: { executionId?: string }) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return [completeDoc(filters?.executionId ?? 'exec-a')];
      }
    );
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores,
    };
    const aggregated = Array.from({ length: 12 }, (_, i) => aggregatedFor(`exec-${i}`)).flat();
    await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    // First pair runs alone for filter detection; the remaining 11 pool at ≤8.
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(8);
    expect(getExampleScores).toHaveBeenCalledTimes(12);
  });

  it('enumerates experiments concurrently in phase 1', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const getExperimentScores = jest.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[];
    });
    const client = {
      getExperimentScores,
      getExampleScores: jest.fn(async () => [completeDoc('exec-a')]),
    };
    const aggregated = Array.from({ length: 8 }, (_, i) => aggregatedFor(`exec-${i}`)).flat();
    await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(6);
    expect(getExperimentScores).toHaveBeenCalledTimes(8);
  });
});
