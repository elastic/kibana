/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kindOf, type DreamedKi } from '../dreaming/dreamed_ki';
import { gatherMaintenance, type GatherOptions } from './gather';
import type { ChangedPage, MaintenanceReader } from './reader';

const WRITER = 'workflow://system-context-engine-maintenance-a';
const deleted = { lifecycle: { status: 'deleted' as const } };
const derivedFrom = (...ids: string[]) =>
  ids.map((id) => ({ uri: `ki://${id}`, relation: 'derived_from' as const }));

const memory = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'memory.session_fact',
  title: `Memory ${id}`,
  content: `What ${id} says.`,
  ...overrides,
});

const fact = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'fact.preference',
  title: `Fact ${id}`,
  content: `Fact ${id}.`,
  references: derivedFrom('m-1'),
  ...overrides,
});

const entity = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'entity.person',
  title: `Entity ${id}`,
  references: derivedFrom('m-1'),
  ...overrides,
});

const relationship = (from: string, relation: string, to: string, overrides = {}): DreamedKi => ({
  id: `rel-${from}-${relation}-${to}`,
  type: 'memory.relationship',
  title: `${from} ${relation} ${to}`,
  attributes: { 'memory.key': `${from}|${relation}|${to}` },
  references: [
    { uri: `ki://${from}`, relation: 'relates_to', description: 'from' },
    { uri: `ki://${to}`, relation: 'relates_to', description: 'to' },
  ],
  ...overrides,
});

const restrictedTo = (name: string) => ({
  kibana: { privileges: [{ space: 'default', name: [name], count: 1 }] },
});

const cursorAt = (position: number) => ({
  from: `2026-11-02T00:00:00.${String(position).padStart(3, '0')}Z`,
  afterId: `cursor-${position}`,
});

const fakeReader = (
  stored: DreamedKi[],
  {
    changed = [],
    resume,
    similar = {},
  }: Partial<Omit<ChangedPage, 'cursors'>> & {
    changed?: DreamedKi[];
    similar?: Record<string, string[]>;
  } = {}
): MaintenanceReader => {
  const byId = new Map(stored.map((ki) => [ki.id, ki]));
  return {
    changedSince: async () => ({
      kis: changed,
      cursors: changed.map((_, position) => cursorAt(position)),
      ...(resume && { resume }),
    }),
    latestByIds: async (ids) =>
      new Map(ids.flatMap((id) => (byId.has(id) ? [[id, byId.get(id)!] as const] : []))),
    citing: async (uris, kind) =>
      stored.filter(
        (ki) =>
          (kind === 'items' ? kindOf(ki) !== undefined : ki.type === 'memory.relationship') &&
          (ki.references ?? []).some(({ uri }) => uris.includes(uri))
      ),
    sweep: async (afterId, size) =>
      stored
        .filter((ki) => kindOf(ki) !== undefined && (!afterId || ki.id > afterId))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, size),
    similar: async (items) =>
      new Map(items.map((ki) => [ki.id, (similar[ki.id] ?? []).map((id) => byId.get(id)!)])),
  };
};

const options: GatherOptions = {
  spaceId: 'default',
  writerUri: WRITER,
  neighbors: 5,
  sweepSize: 0,
  maxTombstoneShare: 0.1,
  since: '2026-11-01T00:00:00.000Z',
};

describe('gatherMaintenance', () => {
  it('reviews changed items with their similar items, skipping its own writes', async () => {
    const stored = [
      memory('m-1'),
      fact('fact-a'),
      fact('fact-b'),
      fact('fact-c', { governance: { provenance: { updated_by: { uri: WRITER, metadata: {} } } } }),
    ];

    const output = await gatherMaintenance(
      fakeReader(stored, {
        changed: [stored[1], stored[3]],
        similar: { 'fact-a': ['fact-b', 'fact-a'] },
      }),
      options
    );

    expect(output.reviewed).toBe(1);
    expect(output.batches).toEqual([
      {
        audience: 'open',
        items: [
          expect.objectContaining({
            id: 'fact-a',
            kind: 'fact',
            reasons: ['changed'],
            neighbor_ids: ['fact-b'],
            occurrences: 1,
          }),
        ],
        neighbors: [expect.objectContaining({ id: 'fact-b' })],
        about_facts: [],
        relationships: [],
      },
    ]);
  });

  it('only compares items with others of their kind and audience', async () => {
    const restricted = { kibana: { privileges: [{ space: 'default', name: ['a'], count: 1 }] } };
    const stored = [
      memory('m-1'),
      fact('fact-a'),
      fact('fact-hidden', { permissions: restricted }),
      entity('entity-a'),
    ];

    const output = await gatherMaintenance(
      fakeReader(stored, {
        changed: [stored[1]],
        similar: { 'fact-a': ['fact-hidden', 'entity-a'] },
      }),
      options
    );

    expect(output.batches[0].items[0].neighbor_ids).toBeUndefined();
    expect(output.batches[0].neighbors).toEqual([]);
  });

  it('tombstones items whose memories were all deleted, and rewrites those that lost some', async () => {
    const stored = [
      memory('m-1', { governance: deleted }),
      memory('m-2'),
      fact('fact-lost'),
      fact('fact-partial', { references: derivedFrom('m-1', 'm-2') }),
    ];

    const output = await gatherMaintenance(fakeReader(stored, { changed: [stored[0]] }), options);

    expect(output.fixes).toEqual([
      { id: 'fact-lost', change: 'tombstoned', reason: 'Every memory it came from was deleted.' },
    ]);
    expect(output.batches[0].items).toEqual([
      expect.objectContaining({
        id: 'fact-partial',
        reasons: ['lost_sources'],
        lost_source_ids: ['m-1'],
        remaining_memories: [{ id: 'm-2', title: 'Memory m-2', content: 'What m-2 says.' }],
      }),
    ]);
    expect(output.counts).toEqual({
      changed: 0,
      lost_sources: 1,
      about_facts_changed: 0,
      sweep: 0,
    });
  });

  it('lists for review items that lost memories but also came from traces', async () => {
    const stored = [
      memory('m-1', { governance: deleted }),
      fact('fact-traced', {
        references: [...derivedFrom('m-1'), { uri: 'trace://abc', relation: 'derived_from' }],
      }),
    ];

    const output = await gatherMaintenance(fakeReader(stored, { changed: [stored[0]] }), options);

    expect(output.batches).toEqual([]);
    expect(output.needs_review).toEqual([
      expect.objectContaining({ id: 'fact-traced', change: 'needs_review' }),
    ]);
  });

  it('refreshes an entity whose facts changed, with the facts about it', async () => {
    const stored = [
      memory('m-1'),
      fact('fact-a', { updated_at: '2026-11-03T00:00:00.000Z' }),
      fact('fact-b', { updated_at: '2026-11-04T00:00:00.000Z' }),
      entity('entity-a'),
      relationship('fact-a', 'about', 'entity-a'),
      relationship('fact-b', 'about', 'entity-a'),
    ];

    const output = await gatherMaintenance(fakeReader(stored, { changed: [stored[1]] }), options);

    const [batch] = output.batches;
    expect(batch.items.map(({ id }) => id)).toEqual(['fact-a', 'entity-a']);
    expect(batch.items[1]).toEqual(
      expect.objectContaining({
        reasons: ['about_facts_changed'],
        about_fact_ids: ['fact-b', 'fact-a'],
      })
    );
    expect(batch.about_facts.map(({ id }) => id)).toEqual(['fact-b']);
    expect(batch.relationships).toEqual([
      { id: 'rel-fact-a-about-entity-a', from: 'fact-a', relation: 'about', to: 'entity-a' },
      { id: 'rel-fact-b-about-entity-a', from: 'fact-b', relation: 'about', to: 'entity-a' },
    ]);
  });

  it('tombstones relationships that link a deleted item or differ in permissions from their ends', async () => {
    const restricted = { kibana: { privileges: [{ space: 'default', name: ['a'], count: 1 }] } };
    const stored = [
      memory('m-1'),
      entity('entity-a'),
      entity('entity-gone', { governance: deleted }),
      entity('entity-b'),
      relationship('entity-a', 'knows', 'entity-gone'),
      relationship('entity-a', 'manages', 'entity-b', { permissions: restricted }),
    ];

    const output = await gatherMaintenance(fakeReader(stored, { changed: [stored[1]] }), options);

    expect(output.fixes).toEqual([
      {
        id: 'rel-entity-a-knows-entity-gone',
        change: 'tombstoned',
        reason: 'It links an item that was deleted.',
      },
      {
        id: 'rel-entity-a-manages-entity-b',
        change: 'tombstoned',
        reason: 'Its permissions differ from those of the items it links.',
      },
    ]);
    expect(output.batches[0].relationships).toEqual([]);
  });

  it('sweeps items in id order, and starts over once it reaches the end', async () => {
    const stored = [memory('m-1'), fact('fact-a'), fact('fact-b'), fact('fact-c')];

    const first = await gatherMaintenance(fakeReader(stored), { ...options, sweepSize: 2 });
    const second = await gatherMaintenance(fakeReader(stored), {
      ...options,
      sweepSize: 2,
      sweepAfterId: first.sweep_after_id,
    });

    expect(first.batches[0].items.map(({ id }) => id)).toEqual(['fact-a', 'fact-b']);
    expect(first.sweep_after_id).toBe('fact-b');
    expect(second.batches[0].items.map(({ id }) => id)).toEqual(['fact-c']);
    expect(second.sweep_after_id).toBe('');
  });

  it('batches items by audience and hands on where to resume', async () => {
    const restricted = { kibana: { privileges: [{ space: 'default', name: ['a'], count: 1 }] } };
    const stored = [memory('m-1'), fact('fact-a'), fact('fact-b', { permissions: restricted })];

    const output = await gatherMaintenance(
      fakeReader(stored, {
        changed: [stored[1], stored[2]],
        resume: { from: '2026-11-02T00:00:00.000Z', afterId: 'fact-b' },
      }),
      options
    );

    expect(output.batches.map(({ items }) => items.map(({ id }) => id))).toEqual([
      ['fact-a'],
      ['fact-b'],
    ]);
    expect(output.resume_from).toBe('2026-11-02T00:00:00.000Z');
    expect(output.resume_after_id).toBe('fact-b');
  });

  it('marks person-edited items', async () => {
    const stored = [
      memory('m-1'),
      fact('fact-a', {
        attributes: { 'memory.edited_by': 'api://context_engine.ki.update' },
      }),
    ];

    const output = await gatherMaintenance(fakeReader(stored, { changed: [stored[1]] }), options);

    expect(output.batches[0].items[0].person_edited).toBe(true);
  });

  it('never shows an entity the facts about it that its audience cannot see', async () => {
    const secret = restrictedTo('a');
    const stored = [
      memory('m-1'),
      entity('entity-a'),
      fact('fact-secret', { permissions: secret }),
      fact('fact-open'),
      relationship('fact-secret', 'about', 'entity-a', { permissions: secret }),
      relationship('fact-open', 'about', 'entity-a'),
    ];

    const onlySecret = await gatherMaintenance(
      fakeReader(stored, { changed: [stored[2]] }),
      options
    );
    const both = await gatherMaintenance(
      fakeReader(stored, { changed: [stored[2], stored[3]] }),
      options
    );

    expect(onlySecret.counts.about_facts_changed).toBe(0);
    expect(onlySecret.batches.flatMap(({ items }) => items.map(({ id }) => id))).toEqual([
      'fact-secret',
    ]);
    const open = both.batches.find(({ audience }) => audience === 'open');
    expect(open?.items.map(({ id }) => id)).toEqual(['fact-open', 'entity-a']);
    expect(open?.items[1].about_fact_ids).toEqual(['fact-open']);
    expect(open?.about_facts).toEqual([]);
    expect(open?.relationships.map(({ id }) => id)).toEqual(['rel-fact-open-about-entity-a']);
  });

  it('caps the facts and relationships one batch shows', async () => {
    const entities = Array.from({ length: 20 }, (_, index) => entity(`entity-${index}`));
    const facts = entities.flatMap(({ id }) =>
      Array.from({ length: 50 }, (_, index) => fact(`fact-${id}-${index}`))
    );
    const links = facts.map(({ id }, index) =>
      relationship(id, 'about', entities[Math.floor(index / 50)].id)
    );

    const output = await gatherMaintenance(
      fakeReader([memory('m-1'), ...entities, ...facts, ...links], { changed: entities }),
      options
    );

    const [batch] = output.batches;
    expect(batch.about_facts).toHaveLength(500);
    expect(batch.relationships).toHaveLength(500);
    const shown = new Set(batch.about_facts.map(({ id }) => id));
    expect(
      batch.items.every(({ about_fact_ids: aboutFactIds = [] }) =>
        aboutFactIds.every((id) => shown.has(id))
      )
    ).toBe(true);
  });

  it('only looks up similar items for what fits, and resumes at the first change left out', async () => {
    const changed = Array.from({ length: 101 }, (_, index) =>
      fact(`fact-${String(index).padStart(3, '0')}`, { permissions: restrictedTo(`r${index}`) })
    );
    const reader = fakeReader([memory('m-1'), ...changed], {
      changed,
      resume: cursorAt(300),
    });
    const similar = jest.spyOn(reader, 'similar');

    const output = await gatherMaintenance(reader, options);

    expect(output.batches).toHaveLength(100);
    expect(output.reviewed).toBe(100);
    expect(output.counts.changed).toBe(100);
    expect(similar.mock.calls[0][0]).toHaveLength(100);
    expect(output.resume_from).toBe(cursorAt(99).from);
    expect(output.resume_after_id).toBe(cursorAt(99).afterId);
  });

  it('sweeps on from the last swept item that fit', async () => {
    const changed = Array.from({ length: 99 }, (_, index) =>
      fact(`c-${String(index).padStart(3, '0')}`, { permissions: restrictedTo(`r${index}`) })
    );
    const swept = Array.from({ length: 25 }, (_, index) =>
      fact(`s-${String(index).padStart(3, '0')}`)
    );

    const output = await gatherMaintenance(
      fakeReader([memory('m-1'), ...changed, ...swept], { changed }),
      { ...options, sweepSize: 25, sweepAfterId: 'r' }
    );

    expect(output.batches).toHaveLength(100);
    expect(output.counts.sweep).toBe(20);
    expect(output.sweep_after_id).toBe('s-019');
    expect(output.resume_from).toBe('');
  });

  it('allows a share of the reviewed items to be tombstoned, and at least a few', async () => {
    const stored = [
      memory('m-1'),
      ...Array.from({ length: 30 }, (_, index) => fact(`fact-${String(index).padStart(2, '0')}`)),
    ];

    const few = await gatherMaintenance(fakeReader(stored), { ...options, sweepSize: 2 });
    const exact = await gatherMaintenance(fakeReader(stored), { ...options, sweepSize: 30 });
    const share = await gatherMaintenance(fakeReader(stored), {
      ...options,
      sweepSize: 30,
      maxTombstoneShare: 0.15,
    });

    expect(few.max_tombstones).toBe(3);
    expect(exact.max_tombstones).toBe(3);
    expect(share.max_tombstones).toBe(5);
  });
});
