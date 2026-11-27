/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DreamedKi } from './dreamed_ki';
import type { DreamingOperation, UpsertEntityOperation } from './resolve_change_set';
import {
  findSupersedingEntity,
  redirectSupersededEntities,
  type SupersededLookup,
} from './superseded_by';

const deleted = { governance: { lifecycle: { status: 'deleted' as const } } };

const entity = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'entity.customer',
  title: id,
  ...overrides,
});

const supersedesRef = (id: string) => ({ uri: `ki://${id}`, relation: 'supersedes' as const });

const lookupOf = (kis: DreamedKi[], spaceId = 'default'): SupersededLookup => ({
  findKi: async (kiId) => kis.find(({ id }) => id === kiId),
  findCiting: async (kiId) =>
    kis.filter(({ references }) => references?.some(({ uri }) => uri === `ki://${kiId}`)),
  spaceId,
});

const upsert = (overrides: Partial<UpsertEntityOperation> = {}): UpsertEntityOperation => ({
  op: 'upsert_entity',
  id: 'entity-customer--acme-corp',
  type: 'customer',
  title: 'Acme Corp',
  description: 'A customer.',
  content: 'Acme Corp is on the Nova tier.',
  attributes: { tier: 'Nova', region: 'EU' },
  accessPatterns: [],
  sourceMemoryIds: ['mem-9'],
  lastSeenAt: '2026-11-10T10:00:00.000Z',
  ...overrides,
});

describe('findSupersedingEntity', () => {
  it('finds the live entity that supersedes a deleted one', async () => {
    const survivor = entity('entity-customer--acme', { references: [supersedesRef('absorbed')] });
    const kis = [entity('absorbed', deleted), survivor];

    await expect(findSupersedingEntity('absorbed', lookupOf(kis))).resolves.toBe(survivor);
  });

  it('follows merges of merges to the live end of the chain', async () => {
    const last = entity('c', { references: [supersedesRef('b')] });
    const kis = [
      entity('a', deleted),
      entity('b', { ...deleted, references: [supersedesRef('a')] }),
      last,
    ];

    await expect(findSupersedingEntity('a', lookupOf(kis))).resolves.toBe(last);
  });

  it('finds nothing for a live entity, one never written, or one deleted without a merge', async () => {
    const kis = [
      entity('live'),
      entity('gone', deleted),
      entity('other', { references: [{ uri: 'ki://gone', relation: 'derived_from' }] }),
    ];

    await expect(findSupersedingEntity('live', lookupOf(kis))).resolves.toBeUndefined();
    await expect(findSupersedingEntity('missing', lookupOf(kis))).resolves.toBeUndefined();
    await expect(findSupersedingEntity('gone', lookupOf(kis))).resolves.toBeUndefined();
  });

  it('ignores a survivor that is not visible in the space, or is not an entity', async () => {
    const kis = [
      entity('absorbed', deleted),
      entity('hidden', {
        references: [supersedesRef('absorbed')],
        permissions: { kibana: { privileges: [{ space: 'other' }] } },
      }),
      entity('fact-1', { type: 'fact.preference', references: [supersedesRef('absorbed')] }),
    ];

    await expect(findSupersedingEntity('absorbed', lookupOf(kis))).resolves.toBeUndefined();
  });

  it('stops on a cycle', async () => {
    const kis = [
      entity('a', { ...deleted, references: [supersedesRef('b')] }),
      entity('b', { ...deleted, references: [supersedesRef('a')] }),
    ];

    await expect(findSupersedingEntity('a', lookupOf(kis))).resolves.toBeUndefined();
  });
});

describe('redirectSupersededEntities', () => {
  it('records a sighting on the survivor and keeps its name, text and attributes', async () => {
    const survivor = entity('entity-customer--acme', {
      title: 'ACME',
      attributes: { tier: 'Gold' },
      references: [supersedesRef('entity-customer--acme-corp')],
    });
    const kis = [entity('entity-customer--acme-corp', deleted), survivor];
    const fact: DreamingOperation = {
      op: 'upsert_fact',
      id: 'fact-1',
      type: 'preference',
      title: 'T',
      content: 'C',
      sourceMemoryIds: ['mem-9'],
    };

    const [redirected, unchanged] = await redirectSupersededEntities(
      [upsert(), fact],
      lookupOf(kis)
    );

    expect(redirected).toEqual({
      op: 'upsert_entity',
      id: 'entity-customer--acme',
      type: 'customer',
      title: 'ACME',
      attributes: { region: 'EU' },
      sourceMemoryIds: ['mem-9'],
      lastSeenAt: '2026-11-10T10:00:00.000Z',
    });
    expect(unchanged).toBe(fact);
  });

  it('leaves entity writes alone when nothing superseded them', async () => {
    const operation = upsert();

    await expect(redirectSupersededEntities([operation], lookupOf([]))).resolves.toEqual([
      operation,
    ]);
  });
});
