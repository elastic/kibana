/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Heap / retention gauges for Step IO.
 *
 * What each case proves (names match asserts):
 * 1. Tiny — N empty steps complete; residual heap is engine/graph only (under slack).
 * 2. Large — N oversized outputs complete; fake ES holds none; no output rehydrate;
 *    residual heap growth over the tiny baseline stays far below N×payload (and near
 *    the cache budget), so the process is not retaining every output.
 * 3. LRU eviction — more producers than the budget can hold; after flush, early
 *    consumers rehydrate from ES (fetch count + exact sizes); after stripping fake
 *    ES, residual tracks the tiny baseline — not N×payload.
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

const STEP_COUNT = 100;

const LRU_PRODUCER_COUNT = 50;
const LRU_EARLY_CONSUMER_COUNT = 10;

/** 10KB budget; 20% admit cap = 2KB per entry. */
const CACHE_BUDGET_BYTES = 10_000;
/**
 * Per-step output for the large case. Sized so N×payload (~5MB) clearly exceeds
 * observed connector/engine heap noise (~1MB); otherwise `vsTiny < N×payload`
 * cannot fail when retention is broken.
 */
const LARGE_OUTPUT_BYTES = 50_000;
/** Fits the 20% admit rule under {@link CACHE_BUDGET_BYTES}. */
const LRU_OUTPUT_BYTES = 1_000;

/**
 * Headroom for engine/graph heap noise (not payload). Used where process heap
 * cannot be compared to the byte-sized cache budget alone.
 */
const ENGINE_HEAP_SLACK_BYTES = 20 * 1024 * 1024;

/**
 * How much larger the large / LRU residual may be than the tiny baseline.
 * At most one cache budget of outputs should remain resident (plus noise).
 */
const VS_TINY_HEAP_MARGIN_BYTES = CACHE_BUDGET_BYTES + 2 * 1024 * 1024;

const maybeGc = (): void => {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (typeof gc === 'function') {
    gc();
  }
};

const heapUsedBytes = (): number => process.memoryUsage().heapUsed;

const formatBytes = (bytes: number): string => {
  if (Math.abs(bytes) < 1024) {
    return `${Math.round(bytes)}B`;
  }
  if (Math.abs(bytes) < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const buildTinyYaml = (n: number): string => {
  const steps = Array.from(
    { length: n },
    (_, i) => `
  - name: step_${i}
    type: console
    with:
      message: ' '`
  ).join('');

  return `
name: memory-tiny-${n}
enabled: false
triggers:
  - type: manual
steps:${steps}
`;
};

const buildLargeYaml = (n: number): string => {
  const steps = Array.from(
    { length: n },
    (_, i) => `
  - name: step_${i}
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: ${LARGE_OUTPUT_BYTES}`
  ).join('');

  return `
name: memory-large-${n}
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
const buildLruEvictionYaml = (producerCount: number, earlyConsumerCount: number): string => {
  const producers = Array.from(
    { length: producerCount },
    (_, i) => `
  - name: produce_${i}
    type: ${FakeConnectors.large_response.actionTypeId}
    connector-id: ${FakeConnectors.large_response.name}
    with:
      sizeBytes: ${LRU_OUTPUT_BYTES}`
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
name: memory-lru-eviction-${producerCount}
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

describe('StepIoService (LRU): memory consumption', () => {
  jest.setTimeout(10 * 60 * 1000);

  /** Baseline heap delta for N empty console steps (engine/graph only). */
  let tinyHeapDelta = 0;

  beforeAll(async () => {
    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    (fixture.configMock as Record<string, unknown>).eviction = {
      maxCacheSize: new ByteSizeValue(CACHE_BUDGET_BYTES),
    };

    maybeGc();
    const before = heapUsedBytes();
    await fixture.runWorkflow({ workflowYaml: buildTinyYaml(STEP_COUNT) });
    jest.clearAllMocks();
    maybeGc();
    tinyHeapDelta = heapUsedBytes() - before;
  });

  it(`completes ${STEP_COUNT} empty console steps with engine-only residual heap (under slack)`, async () => {
    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    (fixture.configMock as Record<string, unknown>).eviction = {
      maxCacheSize: new ByteSizeValue(CACHE_BUDGET_BYTES),
    };

    maybeGc();
    const before = heapUsedBytes();

    await fixture.runWorkflow({ workflowYaml: buildTinyYaml(STEP_COUNT) });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const leafSteps = leafStepsNamed(fixture, 'step_');
    const outputsRetainedInMock = leafSteps.filter((step) => step.output != null).length;

    jest.clearAllMocks();
    maybeGc();
    const delta = heapUsedBytes() - before;

    // eslint-disable-next-line no-console
    console.log(
      `[tiny] ${STEP_COUNT} empty steps → residual heap ${formatBytes(delta)} (limit ${formatBytes(
        ENGINE_HEAP_SLACK_BYTES
      )})`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(leafSteps).toHaveLength(STEP_COUNT);
    expect(leafSteps.every((step) => step.status === ExecutionStatus.COMPLETED)).toBe(true);
    expect(outputsRetainedInMock).toBe(0);
    expect(delta).toBeLessThan(ENGINE_HEAP_SLACK_BYTES);
  });

  it(`completes ${STEP_COUNT} x ${LARGE_OUTPUT_BYTES}B outputs without retaining N×payload beyond the tiny baseline`, async () => {
    const unboundedIoBytes = STEP_COUNT * LARGE_OUTPUT_BYTES;
    expect(unboundedIoBytes).toBeGreaterThan(VS_TINY_HEAP_MARGIN_BYTES);

    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    (fixture.configMock as Record<string, unknown>).eviction = {
      maxCacheSize: new ByteSizeValue(CACHE_BUDGET_BYTES),
    };

    const getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');

    maybeGc();
    const before = heapUsedBytes();

    await fixture.runWorkflow({ workflowYaml: buildLargeYaml(STEP_COUNT) });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const leafSteps = leafStepsNamed(fixture, 'step_');
    const outputsRetainedInMock = leafSteps.filter((step) => step.output != null).length;
    const outputFetchCalls = countOutputFetches(getByIdsSpy);

    jest.clearAllMocks();
    maybeGc();
    const delta = heapUsedBytes() - before;
    const vsTiny = delta - tinyHeapDelta;

    // eslint-disable-next-line no-console
    console.log(
      `[large] ${STEP_COUNT}×${formatBytes(LARGE_OUTPUT_BYTES)} → if retained ${formatBytes(
        unboundedIoBytes
      )}; heap vs tiny ${formatBytes(vsTiny)} (ok < ${formatBytes(
        VS_TINY_HEAP_MARGIN_BYTES
      )}); mock outputs ${outputsRetainedInMock}; ES rehydrates ${outputFetchCalls}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(leafSteps).toHaveLength(STEP_COUNT);
    expect(leafSteps.every((step) => step.status === ExecutionStatus.COMPLETED)).toBe(true);
    // Independent steps + discard: nothing left in fake ES, nothing rehydrated.
    expect(outputsRetainedInMock).toBe(0);
    expect(outputFetchCalls).toBe(0);
    expect(delta).toBeLessThan(ENGINE_HEAP_SLACK_BYTES);
    // Growth over empty-step baseline stays near cache budget — not N×payload.
    expect(vsTiny).toBeLessThan(VS_TINY_HEAP_MARGIN_BYTES);
    expect(vsTiny).toBeLessThan(unboundedIoBytes);
  });

  it(`rehydrates the earliest ${LRU_EARLY_CONSUMER_COUNT} of ${LRU_PRODUCER_COUNT} x ${LRU_OUTPUT_BYTES}B producers after flush/LRU eviction`, async () => {
    const unboundedIoBytes = LRU_PRODUCER_COUNT * LRU_OUTPUT_BYTES;
    expect(unboundedIoBytes).toBeGreaterThan(CACHE_BUDGET_BYTES);

    const fixture = new WorkflowRunFixture();
    // Keep outputs in fake ES — early consumers miss live+LRU after flush/eviction.
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = false;
    (fixture.configMock as Record<string, unknown>).eviction = {
      maxCacheSize: new ByteSizeValue(CACHE_BUDGET_BYTES),
    };

    const getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');

    maybeGc();
    const before = heapUsedBytes();

    await fixture.runWorkflow({
      workflowYaml: buildLruEvictionYaml(LRU_PRODUCER_COUNT, LRU_EARLY_CONSUMER_COUNT),
    });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const producers = leafStepsNamed(fixture, 'produce_');
    // Snapshot before stripMockOutputs — that mutates the same Map entries.
    const earlyReadSnapshots = leafStepsNamed(fixture, 'read_early_').map((step) => ({
      stepId: step.stepId,
      status: step.status,
      output: step.output,
    }));
    const mockOutputsDuringRun = Array.from(
      fixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter((step) => step.output != null).length;
    const outputFetchCalls = countOutputFetches(getByIdsSpy);

    const heapAfterRun = heapUsedBytes();

    stripMockOutputs(fixture);
    jest.clearAllMocks();
    maybeGc();

    const residualDelta = heapUsedBytes() - before;
    const vsTiny = residualDelta - tinyHeapDelta;

    // eslint-disable-next-line no-console
    console.log(
      `[lru] ${LRU_PRODUCER_COUNT}×${formatBytes(LRU_OUTPUT_BYTES)} into ${formatBytes(
        CACHE_BUDGET_BYTES
      )} cache → ${outputFetchCalls}/${LRU_EARLY_CONSUMER_COUNT} early reads rehydrated from ES\n` +
        `      residual vs tiny ${formatBytes(vsTiny)} (if all retained ${formatBytes(
          unboundedIoBytes
        )}; peak during run ${formatBytes(
          heapAfterRun - before
        )} with ${mockOutputsDuringRun} mock outputs)`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(producers).toHaveLength(LRU_PRODUCER_COUNT);
    expect(mockOutputsDuringRun).toBeGreaterThanOrEqual(LRU_PRODUCER_COUNT);
    // Early ids miss live+LRU after flush → one ES output fetch per early reader.
    expect(outputFetchCalls).toBeGreaterThanOrEqual(LRU_EARLY_CONSUMER_COUNT);
    expect(earlyReadSnapshots).toHaveLength(LRU_EARLY_CONSUMER_COUNT);
    for (const read of earlyReadSnapshots) {
      expect(read.status).toBe(ExecutionStatus.COMPLETED);
      expect(String(read.output)).toBe(`early-size=${LRU_OUTPUT_BYTES}`);
    }
    // After stripping fake ES + Jest results, residual tracks engine — not N×payload.
    expect(residualDelta).toBeLessThan(ENGINE_HEAP_SLACK_BYTES);
    expect(vsTiny).toBeLessThan(VS_TINY_HEAP_MARGIN_BYTES);
    expect(vsTiny).toBeLessThan(unboundedIoBytes);
  });
});
