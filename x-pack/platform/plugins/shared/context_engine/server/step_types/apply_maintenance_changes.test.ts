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
  ...['f-1', 'f-2', 'f-3', 'f-4', 'f-5', 'f-6'].map((id, index): [string, DreamedKi] => [
    id,
    fact(id, `2026-03-0${index + 1}T00:00:00.000Z`),
  ]),
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

  it('plans the changes and fixes of a batch without writing', async () => {
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
      held_back: [],
      removals: 1,
      plans: [{ batch, changes }],
    });
  });

  describe('when the model would remove more than half of a batch', () => {
    const largeBatch = {
      ...batch,
      items: ['f-1', 'f-2', 'f-3', 'f-4', 'f-5', 'f-6'].map((id) => ({
        ...toMaintenanceItem(stored.get(id)!),
        reasons: ['changed' as const],
      })),
    };
    const manyRemovals = {
      merges: [
        { survivor: 'f-1', absorbed: ['f-2', 'f-3', 'f-4'], title: 'Plan', reason: 'Same plan' },
      ],
      contradictions: [{ ids: ['f-5', 'f-6'], label: 'conflict', reason: 'Both claim the plan' }],
    };

    it.each([
      ['plans', true],
      ['applies', false],
    ])('%s none of its changes, holding them back', async (_, planOnly) => {
      const context = createMockStepContext({
        input: {
          ai_index_id: 'support',
          batch: largeBatch,
          changes: manyRemovals,
          plan_only: planOnly,
        },
        esClient: {},
      });

      const { output } = await definition().handler(context);

      expect(putKiRevision).not.toHaveBeenCalled();
      expect(softDeleteKi).not.toHaveBeenCalled();
      expect(output).toEqual(
        expect.objectContaining({
          written: 0,
          changes: [],
          needs_review: [],
          removals: 0,
          held_back: [
            {
              reason:
                'The model would remove 4 items for a batch of 6, more than the 3 one batch may.',
              changes: expect.arrayContaining([
                expect.objectContaining({ id: 'f-1', change: 'merged' }),
                expect.objectContaining({ id: 'f-5', change: 'superseded' }),
              ]),
            },
          ],
        })
      );
      expect(output?.held_back[0].changes).toHaveLength(5);
      expect(output?.plans).toEqual(planOnly ? [] : undefined);
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
    expect(output).toEqual(expect.objectContaining({ written: 1 }));
    expect(output).not.toHaveProperty('plans');
  });

  it('rejects every change once no item of the batch is left', async () => {
    const links = [
      { id: 'rel-a', from: 'f-old', relation: 'precedes', to: 'f-new' },
      { id: 'rel-b', from: 'f-new', relation: 'follows', to: 'f-old' },
    ];
    const neighborsOnly = {
      ...batch,
      items: [{ ...toMaintenanceItem(stored.get('f-gone')!), reasons: ['changed' as const] }],
      neighbors: batch.items.map(({ reasons: _reasons, ...item }) => item),
      relationships: links,
    };
    const latest = new Map<string, DreamedKi>([
      ...stored,
      [
        'f-gone',
        { ...stored.get('f-gone')!, governance: { lifecycle: { status: 'deleted' as const } } },
      ],
      ...links.map(({ id }): [string, DreamedKi] => [
        id,
        { id, type: 'memory.relationship', title: id },
      ]),
    ]);
    const reader: Partial<MaintenanceReader> = {
      latestByIds: async (ids) =>
        new Map(ids.flatMap((id) => (latest.has(id) ? [[id, latest.get(id)!] as const] : []))),
      citing: async () => [],
    };
    jest.mocked(createMaintenanceReader).mockReturnValue(reader as MaintenanceReader);
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        batch: neighborsOnly,
        changes: { relationships: [{ id: 'rel-a', reason: 'Inverse of rel-b' }] },
      },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(putKiRevision).not.toHaveBeenCalled();
    expect(softDeleteKi).not.toHaveBeenCalled();
    expect(output?.rejected).toEqual([
      {
        item: 'relationship rel-a',
        reason: 'no item of the batch is left to take its permissions from',
      },
    ]);
  });

  it('rejects an incomplete change on its own, keeping the rest of the batch', async () => {
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        batch,
        changes: {
          ...changes,
          rewrites: [{ id: 'f-old', content: '', reason: 'r' }],
          merges: [{ survivor: 'f-new', absorbed: ['f-old'], title: '', reason: 'x'.repeat(2000) }],
        },
        plan_only: true,
      },
      esClient: {},
    });

    const { output } = await definition().handler(context);

    expect(output?.rejected).toEqual([
      {
        item: 'rewrite 1',
        reason: expect.stringContaining('the model returned it incomplete: content'),
      },
      expect.objectContaining({
        item: 'contradiction between f-old and f-new',
        reason: 'f-old is already changed by another change',
      }),
    ]);
    expect(output?.changes.map(({ id, change }) => [id, change])).toEqual([
      ['f-new', 'merged'],
      ['f-old', 'superseded'],
    ]);
  });

  it('fails on more changes than a batch can hold', async () => {
    const context = createMockStepContext({
      input: {
        ai_index_id: 'support',
        batch,
        changes: {
          rewrites: Array.from({ length: 1000 }, () => ({
            id: 'f-old',
            content: 'c',
            reason: 'r',
          })),
        },
      },
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
