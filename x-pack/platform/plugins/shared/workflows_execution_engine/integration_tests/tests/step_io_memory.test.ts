/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step IO retention gauges (LRU cache size, not process heap):
 *   1. tiny/empty outputs → all admitted; cache ≤ io_retention_budget
 *   2. output > minPayloadSize → never admitted (cache stays empty)
 *   3. output ≤ minPayloadSize → cache ≤ io_retention_budget;
 *      early consumers rehydrate after LRU eviction
 *
 * Mock artefacts that would fake retention:
 * 1. Repository mock retains flushed `output` unless `discardOutputsAfterUpsert`.
 * 2. Jest `fn.mock.results` retains connector returns — clear when sampling behaviour.
 *
 *   node scripts/jest --config=.../jest.integration.config.js step_io_memory
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { ExecutionStatus } from '@kbn/workflows';
import { StepIoService } from '../../server/workflow_context_manager/step_io_service';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const STEP_COUNT = 100;

const LRU_PRODUCER_COUNT = 50;
const LRU_EARLY_CONSUMER_COUNT = 10;

/** Test LRU budget (product default is 10mb; kept small so eviction is observable). */
const IO_RETENTION_BUDGET_BYTES = 10_000;
/** Matches `eviction.minPayloadSize` default — per-entry admit cap. */
const ADMIT_THRESHOLD_BYTES = 10 * 1024;

/**
 * Over-admit payload: larger than minPayloadSize (never enters LRU).
 * Sized so N×payload ≫ budget if admit were broken.
 */
const OVER_ADMIT_OUTPUT_BYTES = 50_000;
/** Under-admit payload: at most minPayloadSize (eligible for LRU). */
const UNDER_ADMIT_OUTPUT_BYTES = 1_000;

const formatBytes = (bytes: number): string => {
  if (Math.abs(bytes) < 1024) {
    return `${Math.round(bytes)}B`;
  }
  if (Math.abs(bytes) < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

/** Same connector as sized runs, with empty payload — fair empty-cache baseline. */
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

  const recentProducerIndex = producerCount - 1;
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
  - name: read_recent
    type: console
    with:
      message: 'recent-size={{ steps.produce_${recentProducerIndex}.output.payload | size }}'
${consumers}
`;
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
    minPayloadSize: new ByteSizeValue(ADMIT_THRESHOLD_BYTES),
  };
};

/** Capture the StepIoService for the next run via its write path (`mock.contexts`). */
const captureStepIoService = (): {
  getResident: () => {
    liveOutputs: number;
    cacheEntries: number;
    cacheBytes: number;
  };
  restore: () => void;
} => {
  const writeSpy = jest.spyOn(StepIoService.prototype, 'write');

  return {
    getResident: () => {
      const latest = writeSpy.mock.contexts.at(-1) as StepIoService | undefined;
      if (!latest) {
        return { liveOutputs: 0, cacheEntries: 0, cacheBytes: 0 };
      }
      return latest.getResidentOutputStats();
    },
    restore: () => {
      writeSpy.mockRestore();
    },
  };
};

describe('StepIoService (LRU): cache retention', () => {
  jest.setTimeout(10 * 60 * 1000);

  it(`admits tiny outputs within io_retention_budget for ${STEP_COUNT} empty-output steps`, async () => {
    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    applyBudget(fixture);
    const stepIoCapture = captureStepIoService();

    await fixture.runWorkflow({ workflowYaml: buildEmptyYaml(STEP_COUNT) });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const leafSteps = leafStepsNamed(fixture, 'step_');
    const outputsRetainedInMock = leafSteps.filter((step) => step.output != null).length;
    const { liveOutputs, cacheEntries, cacheBytes } = stepIoCapture.getResident();
    stepIoCapture.restore();
    jest.clearAllMocks();

    // eslint-disable-next-line no-console
    console.log(
      `[1 empty] io_retention_budget=${formatBytes(IO_RETENTION_BUDGET_BYTES)}  steps=${
        leafSteps.length
      }  live=${liveOutputs}  cache_entries=${cacheEntries}  cache_bytes=${formatBytes(cacheBytes)}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(leafSteps).toHaveLength(STEP_COUNT);
    expect(leafSteps.every((step) => step.status === ExecutionStatus.COMPLETED)).toBe(true);
    expect(outputsRetainedInMock).toBe(0);
    expect(liveOutputs).toBe(0);
    // Tiny outputs fit under minPayloadSize and under the budget, so all stay cached.
    expect(cacheEntries).toBe(STEP_COUNT);
    expect(cacheBytes).toBeGreaterThan(0);
    expect(cacheBytes).toBeLessThanOrEqual(IO_RETENTION_BUDGET_BYTES);
  });

  it(`does not admit outputs larger than minPayloadSize`, async () => {
    expect(OVER_ADMIT_OUTPUT_BYTES).toBeGreaterThan(ADMIT_THRESHOLD_BYTES);
    const unboundedIoBytes = STEP_COUNT * OVER_ADMIT_OUTPUT_BYTES;

    const fixture = new WorkflowRunFixture();
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = true;
    applyBudget(fixture);
    const stepIoCapture = captureStepIoService();

    const getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');

    await fixture.runWorkflow({
      workflowYaml: buildSizedYaml(STEP_COUNT, OVER_ADMIT_OUTPUT_BYTES),
    });

    const execution = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    const leafSteps = leafStepsNamed(fixture, 'step_');
    const outputsRetainedInMock = leafSteps.filter((step) => step.output != null).length;
    const outputFetchCalls = countOutputFetches(getByIdsSpy);
    const { liveOutputs, cacheEntries, cacheBytes } = stepIoCapture.getResident();
    stepIoCapture.restore();
    jest.clearAllMocks();

    // eslint-disable-next-line no-console
    console.log(
      `[2 over-admit] io_retention_budget=${formatBytes(IO_RETENTION_BUDGET_BYTES)}  steps=${
        leafSteps.length
      }  live=${liveOutputs}  cache_entries=${cacheEntries}  cache_bytes=${formatBytes(cacheBytes)}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(leafSteps).toHaveLength(STEP_COUNT);
    expect(leafSteps.every((step) => step.status === ExecutionStatus.COMPLETED)).toBe(true);
    expect(outputsRetainedInMock).toBe(0);
    expect(outputFetchCalls).toBe(0);
    expect(liveOutputs).toBe(0);
    expect(cacheEntries).toBe(0);
    expect(cacheBytes).toBe(0);
    // Guard: if every over-admit payload were retained, it would dwarf the budget.
    expect(unboundedIoBytes).toBeGreaterThan(IO_RETENTION_BUDGET_BYTES);
  });

  it(`keeps cache ≤ io_retention_budget and rehydrates after eviction when outputs ≤ minPayloadSize`, async () => {
    expect(UNDER_ADMIT_OUTPUT_BYTES).toBeLessThanOrEqual(ADMIT_THRESHOLD_BYTES);
    expect(LRU_PRODUCER_COUNT * UNDER_ADMIT_OUTPUT_BYTES).toBeGreaterThan(
      IO_RETENTION_BUDGET_BYTES
    );

    const fixture = new WorkflowRunFixture();
    // Keep outputs in fake ES so early consumers can rehydrate after eviction.
    fixture.stepExecutionRepositoryMock.discardOutputsAfterUpsert = false;
    applyBudget(fixture);
    const stepIoCapture = captureStepIoService();

    const getByIdsSpy = jest.spyOn(fixture.stepExecutionRepositoryMock, 'getStepExecutionsByIds');

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
    const recentProducer = producers.find(
      (step) => step.stepId === `produce_${LRU_PRODUCER_COUNT - 1}`
    );
    const readRecent = Array.from(
      fixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find((step) => step.stepId === 'read_recent');
    const earlyReadSnapshots = leafStepsNamed(fixture, 'read_early_').map((step) => ({
      stepId: step.stepId,
      status: step.status,
      output: step.output,
    }));
    const outputFetchCalls = countOutputFetches(getByIdsSpy);
    const fetchedIds = getByIdsSpy.mock.calls
      .filter((call) => Array.isArray(call[1]) && call[1].includes('output'))
      .flatMap((call) => call[0] as string[]);
    const { liveOutputs, cacheEntries, cacheBytes } = stepIoCapture.getResident();
    stepIoCapture.restore();
    jest.clearAllMocks();

    // eslint-disable-next-line no-console
    console.log(
      `[3 under-admit] io_retention_budget=${formatBytes(IO_RETENTION_BUDGET_BYTES)}  steps=${
        producers.length
      }  live=${liveOutputs}  cache_entries=${cacheEntries}  cache_bytes=${formatBytes(cacheBytes)}`
    );

    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution?.error).toBeUndefined();
    expect(producers).toHaveLength(LRU_PRODUCER_COUNT);
    // Recent producer must still be in the LRU after flush; if admit rejected every
    // producer, this read would also hit ES and the id would appear below.
    expect(readRecent?.status).toBe(ExecutionStatus.COMPLETED);
    expect(String(readRecent?.output)).toBe(`recent-size=${UNDER_ADMIT_OUTPUT_BYTES}`);
    expect(fetchedIds).not.toContain(recentProducer?.id);
    expect(outputFetchCalls).toBeGreaterThanOrEqual(LRU_EARLY_CONSUMER_COUNT);
    expect(earlyReadSnapshots).toHaveLength(LRU_EARLY_CONSUMER_COUNT);
    for (const read of earlyReadSnapshots) {
      expect(read.status).toBe(ExecutionStatus.COMPLETED);
      expect(String(read.output)).toBe(`early-size=${UNDER_ADMIT_OUTPUT_BYTES}`);
    }
    expect(liveOutputs).toBe(0);
    expect(cacheBytes).toBeGreaterThan(0);
    expect(cacheBytes).toBeLessThanOrEqual(IO_RETENTION_BUDGET_BYTES);
    // Producers overflow the budget, so the LRU cannot hold every admitted entry.
    expect(cacheEntries).toBeGreaterThan(0);
    expect(cacheEntries).toBeLessThan(LRU_PRODUCER_COUNT);
  });
});
