/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../../repositories/workflow_execution_repository';
import type { StepIoRef } from '../step_io_service';
import { StepIoService } from '../step_io_service';
import { WorkflowExecutionState } from '../workflow_execution_state';

/**
 * Builds a state + service pair backed by jest-mock repositories. Returns
 * the service under test plus the state so suites can seed step docs via
 * the existing `upsertStep` API.
 */
function buildHarness(opts: { maxBytes?: number } = {}) {
  const workflowExecutionRepository = {
    updateWorkflowExecution: jest.fn(),
    getWorkflowExecutionCancelState: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkflowExecutionRepository>;

  const stepExecutionRepository = {
    bulkUpsert: jest.fn().mockResolvedValue(undefined),
    getStepExecutionsByIds: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<StepExecutionRepository>;

  const fakeWorkflowExecution = {
    id: 'test-workflow-execution-id',
    workflowId: 'test-workflow-id',
    status: ExecutionStatus.RUNNING,
    startedAt: '2025-08-05T20:00:00.000Z',
    isTestRun: false,
  } as EsWorkflowExecution;

  const state = new WorkflowExecutionState(
    fakeWorkflowExecution,
    workflowExecutionRepository,
    stepExecutionRepository
  );
  const service = new StepIoService({
    stepRepository: stepExecutionRepository,
    state,
    maxBytes: opts.maxBytes ?? Infinity,
  });

  return { state, service, stepExecutionRepository, workflowExecutionRepository };
}

/** Default: contextId equals executionId (unique slot per write in simple tests). */
const ref = (executionId: string, contextId: string = executionId): StepIoRef => ({
  executionId,
  contextId,
});

const writeOutput = (
  service: StepIoService,
  executionId: string,
  value: JsonValue | null,
  sizeBytes?: number,
  contextId: string = executionId
) => {
  service.write({
    executionId,
    contextId,
    type: 'output',
    value,
    sizeBytes,
  });
};

const writeInput = (
  service: StepIoService,
  executionId: string,
  value: JsonValue | null,
  sizeBytes?: number,
  contextId: string = executionId
) => {
  service.write({
    executionId,
    contextId,
    type: 'input',
    value,
    sizeBytes,
  });
};

const readOutputs = (
  service: StepIoService,
  ids: string[],
  contextIdFor: (id: string) => string = (id) => id
) =>
  service.readBatch({
    type: 'output',
    refs: ids.map((id) => ref(id, contextIdFor(id))),
  });

const readInputs = (service: StepIoService, ids: string[]) =>
  service.readBatch({
    type: 'input',
    refs: ids.map((id) => ref(id)),
  });

const readErrors = (service: StepIoService, ids: string[]) =>
  service.readBatch({
    type: 'error',
    refs: ids.map((id) => ref(id)),
  });

describe('StepIoService', () => {
  describe('IO reads/writes', () => {
    it('returns a written output', async () => {
      const { service } = buildHarness();
      writeOutput(service, 'step-1', { hello: 'world' });
      expect((await readOutputs(service, ['step-1'])).get('step-1')).toEqual({
        hello: 'world',
      });
    });

    it('returns a written input', async () => {
      const { service } = buildHarness();
      writeInput(service, 'step-1', { foo: 'bar' });
      expect((await readInputs(service, ['step-1'])).get('step-1')).toEqual({ foo: 'bar' });
    });

    it('routes outputs to both the cache and state, and inputs to state only', () => {
      const { state, service } = buildHarness();
      writeInput(service, 'step-1', { foo: 'bar' });
      writeOutput(service, 'step-1', { result: 'ok' });

      expect(state.getStepIo('step-1', 'input')).toEqual({ foo: 'bar' });
      expect(state.getStepIo('step-1', 'output')).toEqual({ result: 'ok' });
    });

    it('omits IO that was never written', async () => {
      const { service } = buildHarness();
      expect((await readOutputs(service, ['missing'])).has('missing')).toBe(false);
      expect((await readInputs(service, ['missing'])).has('missing')).toBe(false);
    });

    it('distinguishes a null output from a missing output', async () => {
      const { service } = buildHarness();
      writeOutput(service, 'step-1', null);
      expect((await readOutputs(service, ['step-1'])).get('step-1')).toBeNull();
    });

    it('returns a state output the LRU refused without fetching', async () => {
      const { service, stepExecutionRepository } = buildHarness({ maxBytes: 0 });
      writeOutput(service, 'step-1', { big: 'x'.repeat(100) });
      // Not flushed yet, so state still holds the output.
      expect((await readOutputs(service, ['step-1'])).get('step-1')).toEqual({
        big: 'x'.repeat(100),
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('returns a step error from the loaded execution without fetching', async () => {
      const { state, service, stepExecutionRepository } = buildHarness();
      state.upsertStep({
        id: 'step-1',
        stepId: 'myStep',
        stepType: 'connector',
        status: ExecutionStatus.FAILED,
        error: { type: 'BadThing', message: 'boom' },
      } as Partial<EsWorkflowStepExecution>);
      expect((await readErrors(service, ['step-1'])).get('step-1')).toEqual({
        type: 'BadThing',
        message: 'boom',
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('fetches an error for a step execution that is not loaded', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'step-1', error: { type: 'BadThing', message: 'boom' } } as EsWorkflowStepExecution,
      ]);

      expect((await readErrors(service, ['step-1'])).get('step-1')).toEqual({
        type: 'BadThing',
        message: 'boom',
      });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['step-1'],
        ['id', 'error']
      );
    });

    it('omits an error when the step execution does not exist', async () => {
      const { service } = buildHarness();
      expect((await readErrors(service, ['does-not-exist'])).has('does-not-exist')).toBe(false);
    });
  });

  describe('getOutputSizeStats', () => {
    it('records the measured size of written outputs', () => {
      const { service } = buildHarness();
      writeOutput(service, 'step-1', { result: 'ok' }, 12);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 12, stepCount: 1 });
    });

    it('does not record a size when the caller measured none', () => {
      const { service } = buildHarness();
      writeOutput(service, 'step-1', null);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('replaces the recorded size when an output is rewritten', () => {
      const { service } = buildHarness();
      writeOutput(service, 'step-1', { v: 1 }, 10);
      writeOutput(service, 'step-1', { v: 2 }, 25);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 25, stepCount: 1 });
    });

    it('ignores negative or non-finite sizes', () => {
      const { service } = buildHarness();
      writeOutput(service, 'step-1', { ok: true }, -1);
      writeOutput(service, 'step-1', { ok: true }, NaN);
      writeOutput(service, 'step-1', { ok: true }, Infinity);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });

    it('does not record input sizes', () => {
      const { service } = buildHarness();
      writeInput(service, 'step-1', { in: true }, 50);

      expect(service.getOutputSizeStats()).toEqual({ totalBytes: 0, stepCount: 0 });
    });
  });

  describe('accessibility-keyed cache', () => {
    it('overwrites the same contextId when a newer execution writes', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      writeOutput(service, 'exec-old', { v: 'old' }, undefined, 'process');
      writeOutput(service, 'exec-new', { v: 'new' }, undefined, 'process');
      state.clearFlushedOutputs(['exec-old', 'exec-new']);

      expect(
        (await service.readBatch({ type: 'output', refs: [ref('exec-new', 'process')] })).get(
          'exec-new'
        )
      ).toEqual({ v: 'new' });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('misses when contextId matches but executionId does not (rehydrates by id)', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      writeOutput(service, 'exec-new', { v: 'new' }, undefined, 'process');
      state.clearFlushedOutputs(['exec-new']);
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'exec-old', output: { v: 'old' } } as unknown as EsWorkflowStepExecution,
      ]);

      expect(
        (await service.readBatch({ type: 'output', refs: [ref('exec-old', 'process')] })).get(
          'exec-old'
        )
      ).toEqual({ v: 'old' });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['exec-old'],
        ['id', 'output']
      );
    });

    it('keeps parallel branches with different contextIds isolated', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      writeOutput(service, 'exec-b0', { branch: 0 }, undefined, 'process|fanOut=p1|branch=0');
      writeOutput(service, 'exec-b1', { branch: 1 }, undefined, 'process|fanOut=p1|branch=1');
      state.clearFlushedOutputs(['exec-b0', 'exec-b1']);

      const batch = await service.readBatch({
        type: 'output',
        refs: [
          ref('exec-b0', 'process|fanOut=p1|branch=0'),
          ref('exec-b1', 'process|fanOut=p1|branch=1'),
        ],
      });
      expect(batch.get('exec-b0')).toEqual({ branch: 0 });
      expect(batch.get('exec-b1')).toEqual({ branch: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('prefers live state over a conflicting LRU entry on the first pass', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      writeOutput(service, 'a', { from: 'cache' }, undefined, 'ctx-a');
      state.clearFlushedOutputs(['a']);
      // Put a different value in live state for the same execution without going through write
      // (write would update both). Simulates an unflushed rewrite that left a stale cache stamp.
      state.setStepIo('a', { output: { from: 'live' } });

      expect(
        (await service.readBatch({ type: 'output', refs: [ref('a', 'ctx-a')] })).get('a')
      ).toEqual({ from: 'live' });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });
  });

  describe('readBatch', () => {
    it('fetches uncached outputs and keeps a fitting output in the LRU', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', output: { v: 1 } } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await readOutputs(service, ['a'])).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      expect((await readOutputs(service, ['a'])).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('does not fetch an output that is already cached', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      writeOutput(service, 'a', { v: 1 });
      // Simulate a flush: the output lives only in the cache now.
      state.clearFlushedOutputs(['a']);

      expect((await readOutputs(service, ['a'])).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('does not fetch an output that is still held in state', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      state.setStepIo('a', { output: { v: 1 } });

      expect((await readOutputs(service, ['a'])).get('a')).toEqual({ v: 1 });
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('does not call the repository for an empty id list', async () => {
      const { service, stepExecutionRepository } = buildHarness();

      await readOutputs(service, []);

      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('returns a document without output as null and keeps that null cached', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a' } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await readOutputs(service, ['a'])).get('a')).toBeNull();

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      expect((await readOutputs(service, ['a'])).get('a')).toBeNull();
      expect(stepExecutionRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
    });

    it('omits documents the repository does not return', async () => {
      const { service } = buildHarness();

      expect((await readOutputs(service, ['ghost'])).has('ghost')).toBe(false);
    });

    it('does not overwrite an output that was written while the fetch was in flight', async () => {
      const { service, stepExecutionRepository } = buildHarness();
      stepExecutionRepository.getStepExecutionsByIds.mockImplementation(async () => {
        writeOutput(service, 'a', { fresh: true });
        return [{ id: 'a', output: { stale: true } } as unknown as EsWorkflowStepExecution];
      });

      expect((await readOutputs(service, ['a'])).get('a')).toEqual({ fresh: true });
    });

    it('returns an oversized output in the map and leaves it out of the LRU', async () => {
      const { service, stepExecutionRepository } = buildHarness({ maxBytes: 0 });
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', output: { v: 'a' } } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await readOutputs(service, ['a'])).get('a')).toEqual({ v: 'a' });

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      await readOutputs(service, ['a']);
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );
    });

    it('keeps an output a sibling cached during the fetch when this batch evicts it', async () => {
      // 9 bytes is 20% of a 45-byte budget, so the sibling copy is admitted.
      // Five more 9-byte inserts then push it out of the cache.
      const { service, state, stepExecutionRepository } = buildHarness({ maxBytes: 45 });
      const others = ['b', 'c', 'd', 'e', 'f'].map(
        (id) => ({ id, output: { v: 'b' } } as unknown as EsWorkflowStepExecution)
      );
      stepExecutionRepository.getStepExecutionsByIds.mockImplementation(async () => {
        writeOutput(service, 'a', { v: 'cached' }, 9);
        state.clearFlushedOutputs(['a']);
        return [
          { id: 'a', output: { v: 'from-es' } } as unknown as EsWorkflowStepExecution,
          ...others,
        ];
      });

      const batch = await readOutputs(service, ['a', 'b', 'c', 'd', 'e', 'f']);

      expect(batch.get('a')).toEqual({ v: 'cached' });
      expect(batch.get('b')).toEqual({ v: 'b' });
    });

    it('keeps a resident output in the returned map when the same batch evicts it', async () => {
      const { service, state, stepExecutionRepository } = buildHarness({ maxBytes: 45 });
      writeOutput(service, 'a', { v: 'a' }, 9);
      state.clearFlushedOutputs(['a']);
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue(
        ['b', 'c', 'd', 'e', 'f'].map(
          (id) => ({ id, output: { v: 'b' } } as unknown as EsWorkflowStepExecution)
        )
      );

      const batch = await readOutputs(service, ['a', 'b', 'c', 'd', 'e', 'f']);

      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledTimes(1);
      expect(batch.get('a')).toEqual({ v: 'a' });
      expect(batch.get('b')).toEqual({ v: 'b' });

      stepExecutionRepository.getStepExecutionsByIds.mockClear();
      const again = await readOutputs(service, ['a', 'b']);
      expect(again.get('b')).toEqual({ v: 'b' });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'output']
      );
    });

    it('fetches an input that state dropped after the step finished', async () => {
      const { service, state, stepExecutionRepository } = buildHarness();
      state.upsertStep({
        id: 'a',
        stepId: 'foreach',
        stepType: 'foreach',
        status: ExecutionStatus.COMPLETED,
      } as Partial<EsWorkflowStepExecution>);
      writeInput(service, 'a', { items: [1] });
      state.clearFlushedOutputs(['a']);
      stepExecutionRepository.getStepExecutionsByIds.mockResolvedValue([
        { id: 'a', input: { items: [1] } } as unknown as EsWorkflowStepExecution,
      ]);

      expect((await readInputs(service, ['a'])).get('a')).toEqual({ items: [1] });
      expect(stepExecutionRepository.getStepExecutionsByIds).toHaveBeenCalledWith(
        ['a'],
        ['id', 'input']
      );
    });
  });
});
