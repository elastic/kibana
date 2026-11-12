/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { findKiRevision, putKiRevision } from '../ai_indices/ki_revision';
import { softDeleteKi } from '../ai_indices/ki_write';
import type { ApplyContext, PlannedWrite } from '../dreaming/apply';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { applyMaintenanceGroups } from './apply_maintenance';
import type { MaintenanceGroup } from './resolve_changes';

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

const writer = { uri: 'workflow://maintenance', metadata: {} };
const restricted = { kibana: { privileges: [{ space: 'default', name: ['a'], count: 1 }] } };
const stored = new Map<string, DreamedKi>();

const context = (overrides: Partial<ApplyContext> = {}): ApplyContext => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  aiIndexId: 'a',
  dest: { type: 'index', value: 'ai-index-idx-a' },
  writer,
  spaceId: 'default',
  memoryPermissions: new Map(),
  audience: { permissions: undefined },
  ...overrides,
});

const entity = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'entity.person',
  title: id,
  ...overrides,
});

const mergeGroup = (overrides: Partial<MaintenanceGroup> = {}): MaintenanceGroup => ({
  item: 'merge into e-1',
  writes: [{ id: 'e-1', build: (current) => current && { ...current, content: 'Merged.' } }],
  moves: [
    { id: 'rel-new', document: entity('rel-new', { type: 'memory.relationship' }) },
    { id: 'rel-existing', document: entity('rel-existing', { type: 'memory.relationship' }) },
  ],
  tombstones: ['e-2'],
  changes: [
    { id: 'e-1', change: 'merged', reason: 'Same' },
    { id: 'e-2', change: 'superseded', reason: 'Same' },
  ],
  ...overrides,
});

describe('applyMaintenanceGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stored.clear();
    jest.mocked(findKiRevision).mockImplementation(async ({ kiId }) => {
      const source = stored.get(kiId);
      return source
        ? { index: 'ai-index-idx-a', documentId: kiId, seqNo: 1, primaryTerm: 1, source }
        : undefined;
    });
    jest.mocked(putKiRevision).mockResolvedValue(undefined);
    jest.mocked(softDeleteKi).mockImplementation(async (_, { kiId }) => ({
      id: kiId,
      deletedRelationshipIds: [],
    }));
    stored.set('e-1', entity('e-1'));
    stored.set('e-2', entity('e-2'));
    stored.set('rel-existing', entity('rel-existing', { type: 'memory.relationship' }));
  });

  it('writes the kept item, then the moved relationships that do not exist, then tombstones', async () => {
    const result = await applyMaintenanceGroups(context(), [mergeGroup()]);

    expect(jest.mocked(putKiRevision).mock.calls.map(([{ kiId }]) => kiId)).toEqual([
      'e-1',
      'rel-new',
    ]);
    expect(softDeleteKi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kiId: 'e-2', deleteLinkedRelationships: true })
    );
    expect(result).toEqual({
      written: 2,
      tombstoned: ['e-2'],
      changes: mergeGroup().changes,
      rejected: [],
    });
  });

  it('changes nothing in a group whose kept item is for another audience', async () => {
    stored.set('e-1', entity('e-1', { permissions: restricted }));

    const result = await applyMaintenanceGroups(context(), [mergeGroup()]);

    expect(putKiRevision).not.toHaveBeenCalled();
    expect(softDeleteKi).not.toHaveBeenCalled();
    expect(result.rejected).toEqual([
      { item: 'merge into e-1', reason: 'e-1 has different permissions than the batch' },
    ]);
  });

  it('never tombstones a person-edited item', async () => {
    stored.set(
      'e-2',
      entity('e-2', {
        attributes: { 'memory.edited_by': 'api://context_engine.ki.update' },
      })
    );

    const result = await applyMaintenanceGroups(context(), [mergeGroup()]);

    expect(softDeleteKi).not.toHaveBeenCalled();
    expect(result.tombstoned).toEqual([]);
    expect(result.changes.map(({ id }) => id)).toEqual(['e-1']);
    expect(result.rejected).toEqual([
      { item: 'merge into e-1: tombstone e-2', reason: 'a person edited it' },
    ]);
  });

  it('only plans on a dry run', async () => {
    const dryRun = new Map<string, PlannedWrite>();

    const result = await applyMaintenanceGroups(context({ dryRun }), [mergeGroup()]);

    expect(putKiRevision).not.toHaveBeenCalled();
    expect(softDeleteKi).not.toHaveBeenCalled();
    expect(result.tombstoned).toEqual(['e-2']);
    expect([...dryRun].map(([id, { change }]) => [id, change])).toEqual([
      ['e-1', 'updated'],
      ['rel-new', 'created'],
      ['e-2', 'deleted'],
    ]);
  });

  it('tombstones a fix for any audience', async () => {
    stored.set(
      'rel-bad',
      entity('rel-bad', { type: 'memory.relationship', permissions: restricted })
    );

    const result = await applyMaintenanceGroups(context({ audience: 'own' }), [
      {
        item: 'fix rel-bad',
        writes: [],
        moves: [],
        tombstones: ['rel-bad'],
        changes: [{ id: 'rel-bad', change: 'tombstoned', reason: 'Permissions differ' }],
      },
    ]);

    expect(result.tombstoned).toEqual(['rel-bad']);
  });
});
