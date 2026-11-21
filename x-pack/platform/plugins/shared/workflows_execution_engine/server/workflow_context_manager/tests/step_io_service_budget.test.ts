/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { StepExecutionRepository } from '../../repositories/step_execution_repository';
import type { StepIoRef } from '../step_io_service';
import { StepIoService } from '../step_io_service';
import type { WorkflowExecutionState } from '../workflow_execution_state';

const ref = (executionId: string): StepIoRef => ({ executionId, contextId: executionId });

const readOutputs = (service: StepIoService, ids: string[]) =>
  service.readBatch({ type: 'output', refs: ids.map(ref) });

const buildService = (maxBytes: number, docs: Array<{ id: string; output: unknown }>) => {
  const stepRepository = {
    getStepExecutionsByIds: jest.fn().mockResolvedValue(docs),
  } as unknown as jest.Mocked<StepExecutionRepository>;
  const state = {
    setStepIo: jest.fn(),
    getStepIo: jest.fn().mockReturnValue(undefined),
  } as unknown as jest.Mocked<WorkflowExecutionState>;
  return { service: new StepIoService({ stepRepository, state, maxBytes }), stepRepository };
};

describe('StepIoService cache budget', () => {
  it('returns every output and keeps only what fits in the LRU', async () => {
    // {"v":"a"} is 9 bytes, exactly 20% of a 45-byte budget. Six of them exceed it.
    const output = { v: 'a' };
    const docs = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, output }));
    const { service, stepRepository } = buildService(45, docs);

    const batch = await readOutputs(
      service,
      docs.map((doc) => doc.id)
    );

    for (const doc of docs) {
      expect(batch.get(doc.id)).toEqual(output);
    }

    stepRepository.getStepExecutionsByIds.mockClear();
    await readOutputs(
      service,
      docs.map((doc) => doc.id)
    );
    const refetched = stepRepository.getStepExecutionsByIds.mock.calls[0]?.[0] ?? [];
    expect(refetched.length).toBeGreaterThan(0);
    expect(refetched.length).toBeLessThan(docs.length);
  });

  it('does not cache an output larger than 20% of the budget', async () => {
    const output = { v: 'a'.repeat(30) };
    const { service, stepRepository } = buildService(45, [{ id: 'a', output }]);

    expect((await readOutputs(service, ['a'])).get('a')).toEqual(output);

    stepRepository.getStepExecutionsByIds.mockClear();
    await readOutputs(service, ['a']);

    expect(stepRepository.getStepExecutionsByIds).toHaveBeenCalledWith(['a'], ['id', 'output']);
  });

  it('returns an output that cannot fit and fetches it again afterwards', async () => {
    const { service, stepRepository } = buildService(0, [{ id: 'a', output: { v: 1 } }]);

    expect((await readOutputs(service, ['a'])).get('a')).toEqual({ v: 1 });

    stepRepository.getStepExecutionsByIds.mockClear();
    await readOutputs(service, ['a']);

    expect(stepRepository.getStepExecutionsByIds).toHaveBeenCalledWith(['a'], ['id', 'output']);
  });

  it('keeps an empty output that fits the budget', async () => {
    const { service, stepRepository } = buildService(100, [{ id: 'a', output: null }]);

    expect((await readOutputs(service, ['a'])).get('a')).toBeNull();

    stepRepository.getStepExecutionsByIds.mockClear();
    expect((await readOutputs(service, ['a'])).get('a')).toBeNull();
    expect(stepRepository.getStepExecutionsByIds).not.toHaveBeenCalled();
  });

  it('reports execution-wide output sizes regardless of eviction', () => {
    const { service } = buildService(100, []);

    service.write({
      executionId: 'a',
      contextId: 'a',
      type: 'output',
      value: { v: 1 } as JsonValue,
      sizeBytes: 90,
    });
    service.write({
      executionId: 'b',
      contextId: 'b',
      type: 'output',
      value: { v: 2 } as JsonValue,
      sizeBytes: 90,
    });
    service.write({
      executionId: 'c',
      contextId: 'c',
      type: 'output',
      value: { v: 3 } as JsonValue,
    });

    expect(service.getOutputSizeStats()).toEqual({ totalBytes: 180, stepCount: 2 });
  });
});
