/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexService } from '../ai_indices/service';
import { getRecordMaintenanceRunStepDefinition } from './record_maintenance_run';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

const input = {
  ai_index_id: 'support',
  mode: 'report',
  braked: true,
  reviewed: 12,
  written: 3,
  changes: [
    { id: 'e-1', change: 'merged', reason: 'Same person' },
    { id: 'e-2', change: 'superseded', reason: 'Same person' },
    { id: 'f-1', change: 'superseded', reason: 'Conflicts with f-2' },
    { id: 'rel-1', change: 'tombstoned', reason: 'Links a deleted item' },
  ],
  needs_review: [{ id: 'f-3', change: 'needs_review', reason: 'A person edited it' }],
  rejected: [],
};

describe('getRecordMaintenanceRunStepDefinition', () => {
  const telemetry = mockKiStepTelemetry();
  const definition = ({ dreamingAvailable = true, canWrite = true } = {}) =>
    getRecordMaintenanceRunStepDefinition({
      getAiIndexService: () =>
        ({
          get: jest.fn().mockResolvedValue({
            id: 'support',
            dest: { type: 'index', value: 'ai-index-idx-support' },
            managed: false,
            dreaming: { enabled: true },
          }),
        } as unknown as AiIndexService),
      isDreamingAvailable: async () => dreamingAvailable,
      checkWritePrivilege: async () => canWrite,
      ...telemetry,
    });

  beforeEach(() => jest.clearAllMocks());

  it('counts the changes of each kind and reports them without any text', async () => {
    const context = createMockStepContext({ input, esClient: {} });

    const { output } = await definition().handler(context);

    const counts = {
      reviewed: 12,
      written: 3,
      merged: 1,
      superseded: 2,
      rewritten: 0,
      summarized: 0,
      tombstoned: 1,
      needs_review: 1,
      rejected: 0,
    };
    expect(output).toEqual(counts);
    expect(telemetry.analyticsService.reportMemoryMaintenanceRun).toHaveBeenCalledWith({
      ai_index_id: 'support',
      mode: 'report',
      braked: true,
      ...counts,
    });
  });

  it.each([
    ['dreaming is unavailable', { dreamingAvailable: false }],
    ['the user cannot write KIs', { canWrite: false }],
  ])('reports nothing while %s', async (_, options) => {
    const context = createMockStepContext({ input, esClient: {} });

    const thrown = await definition(options)
      .handler(context)
      .catch((error) => error);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(telemetry.analyticsService.reportMemoryMaintenanceRun).not.toHaveBeenCalled();
  });
});
