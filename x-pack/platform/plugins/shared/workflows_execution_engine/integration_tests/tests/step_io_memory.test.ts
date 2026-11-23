/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step IO heap gauges:
 *   1. empty outputs → average_memory
 *   2. output > 20% admit → average_memory + io_retention_budget (logged separately)
 *   3. output < 20% admit → average_memory + io_retention_budget (logged separately);
 *      early consumers also rehydrate after LRU eviction
 *
 * Mock artefacts that would fake a leak:
 * 1. Repository mock retains flushed `output` unless `discardOutputsAfterUpsert`.
 * 2. Jest `fn.mock.results` retains connector returns — clear before sampling.
 *
 *   node --expose-gc scripts/jest --config=.../jest.integration.config.js step_io_memory
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';
import { StepIoService } from '../../server/workflow_context_manager/step_io_service';

const STEP_COUNT = 100;

const LRU_PRODUCER_COUNT = 50;
const LRU_EARLY_CONSUMER_COUNT = 10;

/** Matches StepIoService.CACHED_OUTPUT_FRACTION. */
const ADMIT_FRACTION = 0.2;

/** 10KB Step IO retention budget → admit threshold 2KB. */
const IO_RETENTION_BUDGET_BYTES = 10_000;
const ADMIT_THRESHOLD_BYTES = Math.floor(IO_RETENTION_BUDGET_BYTES * ADMIT_FRACTION);

/**
 * Over-admit payload: must exceed the 20% threshold (never enters LRU).
 * Sized so N×payload ≫ engine noise, so unbounded retention would fail the ceiling.
 */
const OVER_ADMIT_OUTPUT_BYTES = 50_000;
/** Under-admit payload: fits under the 20% threshold (eligible for LRU). */
const UNDER_ADMIT_OUTPUT_BYTES = 1_000;

/**
 * Process-heap noise above average_memory + budget. Not part of the product
 * budget — only so asserts survive V8/connector variance.
 */
const HEAP_NOISE_BYTES = 2 * 1024 * 1024;

const maybeGc = (): void => {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (typeof gc === 'function') {
    // Two passes: the first often frees enough for the second to settle.
    gc();
    gc();
  }
};

const heapUsedBytes = (): number => process.memoryUsage().heapUsed;

/** Heap delta for a run (negative means GC reclaimed more than the run retained). */
const residualHeap = (before: number): number => heapUsedBytes() - before;

const formatBytes = (bytes: number): string => {
  if (Math.abs(bytes) < 1024) {
    return `${Math.round(bytes)}B`;
  }
  if (Math.abs(bytes) < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const expectedCeiling = (averageMemory: number): number =>
  averageMemory + IO_RETENTION_BUDGET_BYTES + HEAP_NOISE_BYTES;

/** Same connector as sized runs, with empty payload — fair average_memory baseline. */
const buildEmptyYaml = (n: number): string => buildSizedYaml(n, 0);

const buildSizedYaml = (n: number, sizeBytes: number): string => {
  const steps = Array.from(
    { length: n },
    (_, i) => `
  - name: step_${i}
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: ${sizeBytes}`
  ).join('');

  return `
name: memory-sized-${n}-${sizeBytes}
enabled: false
triggers:
  - type: manual
steps:${steps}
`;
};

/**
 * Producers overflow the LRU; wait flushes the live map; early consumers miss
 * live+LRU and rehydrate from ES.
 */
const buildUnderAdmitEvictionYaml = (
  producerCount: number,
  earlyConsumerCount: number,
  sizeBytes: number
): string => {
  const producers = Array.from(
    { length: producerCount },
    (_, i) => `
  - name: produce_${i}
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: ${sizeBytes}`
  ).join('');

  const consumers = Array.from(
    { length: earlyConsumerCount },
    (_, i) => `
  - name: read_early_${i}
    type: console
    with:
      message: 'early-size={{ steps.produce_${i}.output.payload | size }}'`
  ).join('');

  return `
name: memory-under-admit-eviction-${producerCount}
enabled: false
triggers:
  - type: manual
steps:${producers}
  - name: let_flush_run
    type: wait
    with:
      duration: 1s
${consumers}
`;
};

const stripMockOutputs = (fixture: WorkflowRunFixture): void => {
  for (const step of fixture.stepExecutionRepositoryMock.stepExecutions.values()) {
    delete (step as { output?: unknown }).output;
    delete (step as { input?: unknown }).input;
  }
};

const countOutputFetches = (spy: jest.SpyInstance): number =>
  spy.mock.calls.filter((call) => Array.isArray(call[1]) && call[1].includes('output')).length;

const leafStepsNamed = (
  fixture: WorkflowRunFixture,
  prefix: string
): Array<{ stepId: string; status: string; output?: unknown }> =>
  Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).filter((step) =>
    step.stepId.startsWith(prefix)
  );

const applyBudget = (fixture: WorkflowRunFixture): void => {
  (fixture.configMock as Record<string, unknown>).eviction = {
    maxCacheSize: new ByteSizeValue(IO_RETENTION_BUDGET_BYTES),
  };
};

/** Capture the StepIoService for the next run via its write path. */
const captureStepIoService = (): {
  getResident: () => { stepsRetained: number; cacheBytes: number };
  restore: () => void;
} => {
  let latest: StepIoService | undefined;
  const originalWrite = StepIoService.prototype.write;
  const writeSpy = jest
    .spyOn(StepIoService.prototype, 'write')
    .mockImplementation(function (this: StepIoService, ...args) {
      latest = this;
      return originalWrite.apply(this, args);
    });

  return {
    getResident: () => {
      if (!latest) {
        return { stepsRetained: 0, cacheBytes: 0 };
      }
      const { liveOutputs, cacheEntries, cacheBytes } = latest.getResidentOutputStats();
      return { stepsRetained: liveOutputs + cacheEntries, cacheBytes };
    },
    restore: () => {
      writeSpy.mockRestore();
    },
  };
};

describe('StepIoService (LRU): memory consumption', () => {
  jest.setTimeout(10 * 60 * 1000);

  /** Engine/graph heap for N empty-output steps — the average_memory baseline. */
  let averageMemory = 0;

  it(`measures average_memory for ${STEP_COUNT} empty-output steps`, async () => {
    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    applyBudget(fixture);
    const stepIoCapture = captureStepIoService();

    maybeGc();
    const before = heapUsedBytes();

    await fixture.runWorkflow({ workflowYaml: buildEmptyYaml(STEP_COUNT) });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const leafSteps = leafStepsNamed(fixture, 'step_');
    const outputsRetainedInMock = leafSteps.filter((step) => step.output != null).length;
    const { stepsRetained, cacheBytes } = stepIoCapture.getResident();
    stepIoCapture.restore();

    jest.clearAllMocks();
    maybeGc();
    averageMemory = residualHeap(before);

    // eslint-disable-next-line no-console
    console.log(
      `[1 empty] average_memory=${formatBytes(averageMemory)}  steps=${leafSteps.length}  retained=${stepsRetained}  cache_bytes=${formatBytes(cacheBytes)}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(leafSteps).toHaveLength(STEP_COUNT);
    expect(leafSteps.every((step) => step.status === ExecutionStatus.COMPLETED)).toBe(true);
    expect(outputsRetainedInMock).toBe(0);
    expect(averageMemory).toBeLessThan(HEAP_NOISE_BYTES * 10);
  });

  it(`reports average_memory and io_retention_budget when each output > 20% admit threshold`, async () => {
    expect(OVER_ADMIT_OUTPUT_BYTES).toBeGreaterThan(ADMIT_THRESHOLD_BYTES);
    const unboundedIoBytes = STEP_COUNT * OVER_ADMIT_OUTPUT_BYTES;
    const ceiling = expectedCeiling(averageMemory);

    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    applyBudget(fixture);
    const stepIoCapture = captureStepIoService();

    const getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');

    maybeGc();
    const before = heapUsedBytes();

    await fixture.runWorkflow({
      workflowYaml: buildSizedYaml(STEP_COUNT, OVER_ADMIT_OUTPUT_BYTES),
    });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const leafSteps = leafStepsNamed(fixture, 'step_');
    const outputsRetainedInMock = leafSteps.filter((step) => step.output != null).length;
    const outputFetchCalls = countOutputFetches(getByIdsSpy);
    const { stepsRetained, cacheBytes } = stepIoCapture.getResident();
    stepIoCapture.restore();

    jest.clearAllMocks();
    maybeGc();
    const used = residualHeap(before);

    // eslint-disable-next-line no-console
    console.log(
      `[2 over-admit] average_memory=${formatBytes(used)}  io_retention_budget=${formatBytes(
        IO_RETENTION_BUDGET_BYTES
      )}  steps=${leafSteps.length}  retained=${stepsRetained}  cache_bytes=${formatBytes(cacheBytes)}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(leafSteps).toHaveLength(STEP_COUNT);
    expect(leafSteps.every((step) => step.status === ExecutionStatus.COMPLETED)).toBe(true);
    expect(outputsRetainedInMock).toBe(0);
    expect(outputFetchCalls).toBe(0);
    expect(used).toBeLessThan(ceiling);
    expect(used).toBeLessThan(unboundedIoBytes);
  });

  it(`reports average_memory and io_retention_budget when each output < 20% admit threshold`, async () => {
    expect(UNDER_ADMIT_OUTPUT_BYTES).toBeLessThanOrEqual(ADMIT_THRESHOLD_BYTES);
    expect(LRU_PRODUCER_COUNT * UNDER_ADMIT_OUTPUT_BYTES).toBeGreaterThan(IO_RETENTION_BUDGET_BYTES);
    const unboundedIoBytes = LRU_PRODUCER_COUNT * UNDER_ADMIT_OUTPUT_BYTES;
    const ceiling = expectedCeiling(averageMemory);

    const fixture = new WorkflowRunFixture();
    // Keep outputs in fake ES so early consumers can rehydrate after eviction.
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = false;
    applyBudget(fixture);
    const stepIoCapture = captureStepIoService();

    const getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');

    maybeGc();
    const before = heapUsedBytes();

    await fixture.runWorkflow({
      workflowYaml: buildUnderAdmitEvictionYaml(
        LRU_PRODUCER_COUNT,
        LRU_EARLY_CONSUMER_COUNT,
        UNDER_ADMIT_OUTPUT_BYTES
      ),
    });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const producers = leafStepsNamed(fixture, 'produce_');
    const earlyReadSnapshots = leafStepsNamed(fixture, 'read_early_').map((step) => ({
      stepId: step.stepId,
      status: step.status,
      output: step.output,
    }));
    const outputFetchCalls = countOutputFetches(getByIdsSpy);
    const { stepsRetained, cacheBytes } = stepIoCapture.getResident();
    stepIoCapture.restore();

    // Drop fake-ES / Jest artefacts so residual is engine + ≤budget, not N×payload.
    stripMockOutputs(fixture);
    jest.clearAllMocks();
    maybeGc();
    const used = residualHeap(before);

    // eslint-disable-next-line no-console
    console.log(
      `[3 under-admit] average_memory=${formatBytes(used)}  io_retention_budget=${formatBytes(
        IO_RETENTION_BUDGET_BYTES
      )}  steps=${producers.length}  retained=${stepsRetained}  cache_bytes=${formatBytes(cacheBytes)}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(producers).toHaveLength(LRU_PRODUCER_COUNT);
    expect(outputFetchCalls).toBeGreaterThanOrEqual(LRU_EARLY_CONSUMER_COUNT);
    expect(earlyReadSnapshots).toHaveLength(LRU_EARLY_CONSUMER_COUNT);
    for (const read of earlyReadSnapshots) {
      expect(read.status).toBe(ExecutionStatus.COMPLETED);
      expect(String(read.output)).toBe(`early-size=${UNDER_ADMIT_OUTPUT_BYTES}`);
    }
    expect(used).toBeLessThan(ceiling);
    expect(used).toBeLessThan(unboundedIoBytes + HEAP_NOISE_BYTES);
  });
});
