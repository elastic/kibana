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
      ...mockKiStepTelemetry(),
    });

  it('counts the changes of each kind', async () => {
    const context = createMockStepContext({ input, esClient: {} });

    const { output } = await definition().handler(context);

    expect(output).toEqual({
      reviewed: 12,
      written: 3,
      merged: 1,
      superseded: 2,
      rewritten: 0,
      summarized: 0,
      tombstoned: 1,
      needs_review: 1,
      rejected: 0,
      held_back: 0,
      changes: [...input.changes, ...input.needs_review],
      held_back_changes: [],
      held_back_ids: [],
    });
  });

  const fix = { id: 'f-9', change: 'tombstoned', reason: 'Its memories were deleted' };
  const modelInput = {
    ...input,
    written: 1,
    changes: [fix],
    needs_review: [],
    model_written: 3,
    model_changes: input.changes,
    model_needs_review: input.needs_review,
  };

  it('counts the model changes with the fixes when they remove no more than the run may', async () => {
    const context = createMockStepContext({
      input: { ...modelInput, max_model_removals: 2 },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(output).toEqual(
      expect.objectContaining({
        written: 4,
        superseded: 2,
        tombstoned: 2,
        needs_review: 1,
        held_back: 0,
        changes: [fix, ...input.changes, ...input.needs_review],
      })
    );
  });

  it('holds back all the model changes when they would remove more than the run may', async () => {
    const context = createMockStepContext({
      input: { ...modelInput, max_model_removals: 1 },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(output).toEqual(
      expect.objectContaining({
        written: 1,
        superseded: 0,
        tombstoned: 1,
        needs_review: 0,
        held_back: 5,
        changes: [fix],
        held_back_changes: [
          {
            reason:
              'The model would remove 2 items, more than the 1 one run may, so none of its changes were made.',
            changes: [...input.changes, ...input.needs_review],
          },
        ],
        held_back_ids: ['e-1', 'e-2', 'f-1', 'rel-1', 'f-3'],
      })
    );
  });

  it('lists the held-back items for the next run, once', async () => {
    const heldBack = {
      reason: 'Too many stale items',
      changes: [
        { id: 'f-4', change: 'tombstoned', reason: 'Its memories were deleted' },
        { id: 'f-5', change: 'tombstoned', reason: 'Its memories were deleted' },
      ],
    };
    const context = createMockStepContext({
      input: { ...input, held_back: [heldBack, heldBack], retried: ['f-5'] },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(output).toEqual(
      expect.objectContaining({
        held_back: 4,
        held_back_changes: [heldBack, heldBack],
        held_back_ids: ['f-4'],
      })
    );
  });

  it.each([
    ['dreaming is unavailable', { dreamingAvailable: false }],
    ['the user cannot write KIs', { canWrite: false }],
  ])('fails while %s', async (_, options) => {
    const context = createMockStepContext({ input, esClient: {} });

    const thrown = await definition(options)
      .handler(context)
      .catch((error) => error);

    expect(thrown).toBeInstanceOf(ExecutionError);
  });
});
