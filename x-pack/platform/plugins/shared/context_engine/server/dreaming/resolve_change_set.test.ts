/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dreamChangeSetSchema,
  type DreamChangeSet,
} from '../../common/step_types/apply_dream_changes';
import type { DreamedKi } from './dreamed_ki';
import { batchKeyOf, factId } from './ids';
import {
  referencedIds,
  resolveChangeSet,
  vocabularyOf,
  type ResolveContext,
  type UpsertEntityOperation,
  type UpsertFactOperation,
} from './resolve_change_set';

const existingEntity: DreamedKi = {
  id: 'entity-person--bob',
  type: 'entity.person',
  title: 'Bob',
  references: [{ uri: 'ki://m-old', relation: 'derived_from' }],
};

const existingFact: DreamedKi = {
  id: 'fact-abc',
  type: 'fact.preference',
  title: 'Bob prefers coffee',
  content: 'Bob drinks coffee.\n\n## Access patterns\n- [orders] Orders',
  references: [{ uri: 'ki://m-old', relation: 'derived_from' }],
};

const context = (overrides: Partial<ResolveContext> = {}): ResolveContext => ({
  executionId: 'exec-1',
  vocabulary: vocabularyOf({
    enabled: true,
    facts: [{ type: 'preference' }],
    entities: {
      nodes: [{ type: 'person', attributes: ['role'] }, { type: 'team' }],
      edges: [{ type: 'member_of', source: 'person', target: 'team' }],
    },
  }),
  memories: new Map([
    ['m-1', '2026-10-01T10:00:00.000Z'],
    ['m-2', '2026-10-02T10:00:00.000Z'],
  ]),
  existing: new Map([
    [existingEntity.id, existingEntity],
    [existingFact.id, existingFact],
  ]),
  ...overrides,
});

const changeSet = (value: Partial<DreamChangeSet>): DreamChangeSet =>
  dreamChangeSetSchema.parse(value);

describe('referencedIds', () => {
  it('lists the existing ids a change set names, without new keys or duplicates', () => {
    expect(
      referencedIds(
        changeSet({
          entities: [{ ref: 'entity-person--bob' }, { ref: 'new:1' }],
          facts: [{ ref: 'fact-abc', about: ['entity-person--bob', 'new:1', 'entity-team--x'] }],
          relationships: [{ type: 'member_of', source: 'new:1', target: 'entity-team--y' }],
        })
      )
    ).toEqual(['entity-person--bob', 'fact-abc', 'entity-team--x', 'entity-team--y']);
  });
});

describe('resolveChangeSet', () => {
  it('creates entities with ids from their type and name, and resolves new keys in facts and relationships', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [
          {
            ref: 'new:1',
            type: 'team',
            name: 'Platform Team',
            content: 'The team Bob is a member of.',
            source_memory_ids: ['m-1'],
          },
        ],
        facts: [
          {
            ref: 'new:2',
            type: 'preference',
            title: 'Bob prefers tea',
            content: 'Bob prefers tea.',
            about: [existingEntity.id, existingEntity.id],
            source_memory_ids: ['m-2'],
          },
        ],
        relationships: [
          {
            type: 'member_of',
            source: existingEntity.id,
            target: 'new:1',
            source_memory_ids: ['m-1'],
          },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([]);
    expect(operations[0]).toEqual({
      op: 'upsert_entity',
      id: 'entity-team--platform-team',
      type: 'team',
      name: 'Platform Team',
      content: 'The team Bob is a member of.',
      attributes: {},
      sourceMemoryIds: ['m-1'],
      lastSeenAt: '2026-10-01T10:00:00.000Z',
    });
    const fact = operations[1] as UpsertFactOperation;
    expect(fact).toMatchObject({
      op: 'upsert_fact',
      id: factId('exec-1', batchKeyOf(['m-1', 'm-2']), 'new:2'),
      about: [existingEntity.id],
      lastSeenAt: '2026-10-02T10:00:00.000Z',
    });
    expect(operations[2]).toMatchObject({
      op: 'relationship',
      sourceId: existingEntity.id,
      targetId: 'entity-team--platform-team',
      type: 'member_of',
      remove: false,
    });
  });

  it('gives the same new key in two batches of one run two different facts', () => {
    const newFact = changeSet({
      facts: [
        { ref: 'new:1', type: 'preference', title: 'T', content: 'C', source_memory_ids: ['m-1'] },
      ],
    });
    const secondBatch = changeSet({
      facts: [
        { ref: 'new:1', type: 'preference', title: 'T', content: 'C', source_memory_ids: ['m-3'] },
      ],
    });

    const first = resolveChangeSet(newFact, context()).operations[0] as UpsertFactOperation;
    const second = resolveChangeSet(
      secondBatch,
      context({ memories: new Map([['m-3', '2026-10-03T10:00:00.000Z']]) })
    ).operations[0] as UpsertFactOperation;
    const retried = resolveChangeSet(newFact, context()).operations[0] as UpsertFactOperation;

    expect(second.id).not.toBe(first.id);
    expect(retried.id).toBe(first.id);
  });

  it('updates an existing item under its own id, keeping what the change leaves out', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [{ ref: existingEntity.id, source_memory_ids: ['m-1'] }],
        facts: [{ ref: existingFact.id, source_memory_ids: ['m-old', 'm-2'] }],
      }),
      context()
    );

    expect(rejected).toEqual([]);
    expect(operations[0]).toMatchObject({ id: existingEntity.id, type: 'person', name: 'Bob' });
    expect(operations[1]).toMatchObject({
      id: existingFact.id,
      type: 'preference',
      title: 'Bob prefers coffee',
      content: 'Bob drinks coffee.',
      sourceMemoryIds: ['m-old', 'm-2'],
    });
  });

  it('rejects unconfigured types and attributes item by item', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [
          { ref: 'new:1', type: 'robot', name: 'R2', source_memory_ids: ['m-1'] },
          {
            ref: 'new:2',
            type: 'person',
            name: 'Carol',
            attributes: [{ key: 'age', value: '40' }],
            source_memory_ids: ['m-1'],
          },
          {
            ref: 'new:3',
            type: 'person',
            name: 'Dan',
            attributes: [{ key: 'role', value: 'SRE' }],
            source_memory_ids: ['m-1'],
          },
        ],
        facts: [
          {
            ref: 'new:4',
            type: 'incident',
            title: 'Outage',
            content: 'It broke.',
            source_memory_ids: ['m-1'],
          },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([
      { item: 'entity new:1', reason: "entity type 'robot' is not configured" },
      {
        item: 'entity new:2',
        reason: "attribute 'age' is not configured for entity type 'person'",
      },
      { item: 'fact new:4', reason: "fact type 'incident' is not configured" },
    ]);
    expect((operations[0] as UpsertEntityOperation).attributes).toEqual({ role: 'SRE' });
  });

  it('rejects items that cite memories the model was not shown, or none', () => {
    const { rejected } = resolveChangeSet(
      changeSet({
        entities: [
          { ref: 'new:1', type: 'team', name: 'A', source_memory_ids: ['m-unknown'] },
          { ref: 'new:2', type: 'team', name: 'B' },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([
      { item: 'entity new:1', reason: 'cites memories it was not shown: m-unknown' },
      { item: 'entity new:2', reason: 'cites no source memories' },
    ]);
  });

  it('rejects a fact ref that is neither existing nor a new key', () => {
    const { rejected } = resolveChangeSet(
      changeSet({
        facts: [
          {
            ref: 'fact-made-up',
            type: 'preference',
            title: 'T',
            content: 'C',
            source_memory_ids: ['m-1'],
          },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([
      {
        item: 'fact fact-made-up',
        reason: "'fact-made-up' is neither an existing fact nor a new key",
      },
    ]);
  });

  it('deletes only existing items of the right kind', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [
          { ref: existingEntity.id, delete: true },
          { ref: existingFact.id, delete: true },
          { ref: 'new:1', delete: true },
        ],
        facts: [{ ref: existingFact.id, delete: true }],
      }),
      context()
    );

    expect(operations).toEqual([
      { op: 'delete', id: existingEntity.id },
      { op: 'delete', id: existingFact.id },
    ]);
    expect(rejected).toEqual([
      {
        item: `entity ${existingFact.id}`,
        reason: `'${existingFact.id}' is not an existing entity`,
      },
      { item: 'entity new:1', reason: 'only an existing entity can be deleted' },
    ]);
  });

  it('rejects a relationship between the wrong entity types, or of an unknown type', () => {
    const { rejected } = resolveChangeSet(
      changeSet({
        entities: [{ ref: 'new:1', type: 'person', name: 'Eve', source_memory_ids: ['m-1'] }],
        relationships: [
          {
            type: 'member_of',
            source: existingEntity.id,
            target: 'new:1',
            source_memory_ids: ['m-1'],
          },
          {
            type: 'manages',
            source: existingEntity.id,
            target: 'new:1',
            source_memory_ids: ['m-1'],
          },
          {
            type: 'member_of',
            source: existingEntity.id,
            target: 'new:9',
            source_memory_ids: ['m-1'],
          },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([
      {
        item: `relationship ${existingEntity.id} member_of new:1`,
        reason: "'member_of' connects a 'person' to a 'team'",
      },
      {
        item: `relationship ${existingEntity.id} manages new:1`,
        reason: "relationship type 'manages' is not configured",
      },
      {
        item: `relationship ${existingEntity.id} member_of new:9`,
        reason: "'new:9' does not refer to an entity",
      },
    ]);
  });

  it('removes a relationship without needing sources', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [{ ref: 'new:1', type: 'team', name: 'Ops', source_memory_ids: ['m-1'] }],
        relationships: [
          { type: 'member_of', source: existingEntity.id, target: 'new:1', remove: true },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([]);
    expect(operations[1]).toEqual({
      op: 'relationship',
      sourceId: existingEntity.id,
      targetId: 'entity-team--ops',
      type: 'member_of',
      remove: true,
      sourceMemoryIds: [],
    });
  });

  it('builds facts only when entities are off, keeping the facts current about references', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [{ ref: 'new:1', type: 'person', name: 'Zed', source_memory_ids: ['m-1'] }],
        facts: [
          {
            ref: 'new:2',
            type: 'preference',
            title: 'Zed likes tea',
            content: 'Zed likes tea.',
            about: ['new:1'],
            source_memory_ids: ['m-1'],
          },
        ],
      }),
      context({ vocabulary: vocabularyOf({ enabled: true, facts: [{ type: 'preference' }] }) })
    );

    expect(rejected).toEqual([
      { item: 'entity new:1', reason: 'this AI index does not build entities' },
    ]);
    expect(operations).toHaveLength(1);
    expect(operations[0]).not.toHaveProperty('about');
  });
});
