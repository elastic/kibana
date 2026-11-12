/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { findKiRevision, putKiRevision } from '../ai_indices/ki_revision';
import { softDeleteKi } from '../ai_indices/ki_write';
import type { AiIndexService } from '../ai_indices/service';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { toMaintenanceItem } from '../maintenance/gather';
import { createMaintenanceReader, type MaintenanceReader } from '../maintenance/reader';
import { getApplyMaintenanceChangesStepDefinition } from './apply_maintenance_changes';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

jest.mock('../maintenance/reader', () => ({ createMaintenanceReader: jest.fn() }));
jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
}));
jest.mock('../ai_indices/ki_write', () => ({
  ...jest.requireActual('../ai_indices/ki_write'),
  softDeleteKi: jest.fn(),
}));
jest.mock('../ai_indices/ki_relationships', () => ({
  findLinkingRelationshipIds: jest.fn(async () => []),
}));

const dest = { type: 'index' as const, value: 'ai-index-idx-support' };
const dreaming = { enabled: true, facts: [{ type: 'plan' }] };

const fact = (id: string, lastSeenAt: string): DreamedKi => ({
  id,
  type: 'fact.plan',
  title: id,
  content: `${id}.`,
  references: [{ uri: `ki://m-${id}`, relation: 'derived_from' }],
  attributes: { 'memory.number_of_occurrences': 1, 'memory.last_seen_at': lastSeenAt },
});

const stored = new Map<string, DreamedKi>([
  ['f-old', fact('f-old', '2026-02-01T00:00:00.000Z')],
  ['f-new', fact('f-new', '2026-05-01T00:00:00.000Z')],
  ['f-gone', fact('f-gone', '2026-01-01T00:00:00.000Z')],
]);

const batch = {
  audience: 'open',
  items: ['f-old', 'f-new'].map((id) => ({
    ...toMaintenanceItem(stored.get(id)!),
    reasons: ['changed' as const],
  })),
  neighbors: [],
  about_facts: [],
  relationships: [],
};

const changes = {
  contradictions: [
    { ids: ['f-old', 'f-new'], label: 'conflict', reason: 'Both claim the current plan' },
  ],
};

describe('getApplyMaintenanceChangesStepDefinition', () => {
  const definition = (dreamingAvailable = true) =>
    getApplyMaintenanceChangesStepDefinition({
      getAiIndexService: () =>
        ({
          get: jest.fn().mockResolvedValue({ id: 'support', dest, managed: false, dreaming }),
        } as unknown as AiIndexService),
      isContextEngineEnabled: async () => true,
      isDreamingAvailable: async () => dreamingAvailable,
      checkWritePrivilege: async () => true,
      ...mockKiStepTelemetry(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    const reader: Partial<MaintenanceReader> = {
      latestByIds: async (ids) =>
        new Map(ids.flatMap((id) => (stored.has(id) ? [[id, stored.get(id)!] as const] : []))),
      citing: async () => [],
    };
    jest.mocked(createMaintenanceReader).mockReturnValue(reader as MaintenanceReader);
    jest.mocked(findKiRevision).mockImplementation(async ({ kiId }) => {
      const source = stored.get(kiId);
      return source
        ? { index: dest.value, documentId: kiId, seqNo: 1, primaryTerm: 1, source }
        : undefined;
    });
    jest.mocked(putKiRevision).mockResolvedValue(undefined);
    jest.mocked(softDeleteKi).mockImplementation(async (_, { kiId }) => ({
      id: kiId,
      deletedRelationshipIds: [],
    }));
  });

  it('plans the changes and fixes of a batch without writing, counting tombstones', async () => {
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        batch,
        changes,
        fixes: [{ id: 'f-gone', change: 'tombstoned', reason: 'Every memory was deleted.' }],
        plan_only: true,
      },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(putKiRevision).not.toHaveBeenCalled();
    expect(softDeleteKi).not.toHaveBeenCalled();
    expect(output).toEqual({
      written: 1,
      tombstones: 2,
      changes: [
        { id: 'f-gone', change: 'tombstoned', reason: 'Every memory was deleted.' },
        {
          id: 'f-old',
          change: 'superseded',
          reason: 'Conflicts with f-new: Both claim the current plan',
        },
      ],
      needs_review: [],
      rejected: [],
      plans: [
        {
          batch,
          changes: {
            merges: [],
            contradictions: changes.contradictions,
            rewrites: [],
            summaries: [],
            relationships: [],
          },
        },
      ],
    });
  });

  it('applies the changes', async () => {
    const context = createMockStepContext({
      input: { ai_index_id: 'support', batch, changes },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(putKiRevision).toHaveBeenCalledWith(expect.objectContaining({ kiId: 'f-new' }));
    expect(softDeleteKi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kiId: 'f-old' })
    );
    expect(output).toEqual(expect.objectContaining({ written: 1, tombstones: 1 }));
    expect(output).not.toHaveProperty('plans');
  });

  it('fails on changes the model got wrong', async () => {
    const context = createMockStepContext({
      input: { ai_index_id: 'support', batch, changes: { merges: [{ survivor: 'f-new' }] } },
      esClient: {},
    });

    await expect(definition().handler(context)).rejects.toThrow(
      'The maintenance model returned invalid changes'
    );
  });

  it('fails while dreaming is unavailable', async () => {
    const context = createMockStepContext({
      input: { ai_index_id: 'support', batch, changes },
      esClient: {},
    });

    const thrown = await definition(false)
      .handler(context)
      .catch((error) => error);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('FeatureDisabledError');
  });
});
