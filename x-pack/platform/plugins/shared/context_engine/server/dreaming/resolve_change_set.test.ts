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
import { audienceKeyOf } from './permissions';
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
    entities: { nodes: [{ type: 'person', attributes: ['role'] }, { type: 'team' }] },
  }),
  memories: new Map([
    ['m-1', '2026-10-01T10:00:00.000Z'],
    ['m-2', '2026-10-02T10:00:00.000Z'],
  ]),
  existing: new Map([
    [existingEntity.id, existingEntity],
    [existingFact.id, existingFact],
  ]),
  memoryPermissions: new Map(),
  ...overrides,
});

const teamA = { kibana: { privileges: [{ space: 'team-a', name: ['ai_index:a/read'] }] } };
const teamB = { kibana: { privileges: [{ space: 'team-a', name: ['ai_index:b/read'] }] } };

const changeSet = (value: Partial<DreamChangeSet>): DreamChangeSet =>
  dreamChangeSetSchema.parse(value);

describe('referencedIds', () => {
  it('lists the existing ids a change set names, without new keys or duplicates', () => {
    expect(
      referencedIds(
        changeSet({
          entities: [{ ref: 'entity-person--bob' }, { ref: 'new:1' }],
          facts: [{ ref: 'fact-abc' }, { ref: 'new:2' }, { ref: 'entity-person--bob' }],
        })
      )
    ).toEqual(['entity-person--bob', 'fact-abc']);
  });
});

describe('resolveChangeSet', () => {
  it('creates entities with ids from their type and name, and facts with ids from their new keys', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [
          {
            ref: 'new:1',
            type: 'team',
            title: 'Platform Team',
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
            source_memory_ids: ['m-2'],
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
      title: 'Platform Team',
      content: 'The team Bob is a member of.',
      attributes: {},
      sourceMemoryIds: ['m-1'],
      lastSeenAt: '2026-10-01T10:00:00.000Z',
    });
    expect(operations[1]).toEqual({
      op: 'upsert_fact',
      id: factId('exec-1', batchKeyOf(['m-1', 'm-2']), 'new:2'),
      type: 'preference',
      title: 'Bob prefers tea',
      content: 'Bob prefers tea.',
      sourceMemoryIds: ['m-2'],
      lastSeenAt: '2026-10-02T10:00:00.000Z',
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
    expect(operations[0]).toMatchObject({ id: existingEntity.id, type: 'person', title: 'Bob' });
    expect(operations[1]).toMatchObject({
      id: existingFact.id,
      type: 'preference',
      title: 'Bob prefers coffee',
      content: 'Bob drinks coffee.',
      sourceMemoryIds: ['m-old', 'm-2'],
    });
  });

  it('keeps a new entity from restricted memories apart from the same name for others', () => {
    const entities = changeSet({
      entities: [{ ref: 'new:1', type: 'person', title: 'Bob', source_memory_ids: ['m-1'] }],
    });
    const memoryPermissions = new Map([['m-1', teamA]]);

    const [open] = resolveChangeSet(entities, context()).operations;
    const [restricted] = resolveChangeSet(entities, context({ memoryPermissions })).operations;

    expect(open).toMatchObject({ id: 'entity-person--bob' });
    expect(restricted).toMatchObject({ id: `entity-person--bob--${audienceKeyOf([teamA])}` });
  });

  it('keys a new entity by the audience of the memories it cites, not of the whole batch', () => {
    const entities = changeSet({
      entities: [{ ref: 'new:1', type: 'person', title: 'Bob', source_memory_ids: ['m-1'] }],
    });

    const [mixedBatch] = resolveChangeSet(
      entities,
      context({
        memoryPermissions: new Map([
          ['m-1', teamA],
          ['m-2', teamB],
        ]),
      })
    ).operations;
    const [teamABatch] = resolveChangeSet(
      entities,
      context({ memoryPermissions: new Map([['m-1', teamA]]) })
    ).operations;

    expect(mixedBatch.id).toBe(teamABatch.id);
  });

  it('accepts types written with their kind prefix, as EXISTING shows them', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [
          { ref: 'new:1', type: 'entity.team', title: 'Platform Team', source_memory_ids: ['m-1'] },
        ],
        facts: [
          {
            ref: 'new:2',
            type: 'fact.preference',
            title: 'Bob prefers tea',
            content: 'Bob prefers tea.',
            source_memory_ids: ['m-2'],
          },
        ],
      }),
      context()
    );

    expect(rejected).toEqual([]);
    expect(operations[0]).toMatchObject({ id: 'entity-team--platform-team', type: 'team' });
    expect(operations[1]).toMatchObject({ type: 'preference' });
  });

  it('rejects unconfigured types and attributes item by item', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [
          { ref: 'new:1', type: 'robot', title: 'R2', source_memory_ids: ['m-1'] },
          {
            ref: 'new:2',
            type: 'person',
            title: 'Carol',
            attributes: [{ key: 'age', value: '40' }],
            source_memory_ids: ['m-1'],
          },
          {
            ref: 'new:3',
            type: 'person',
            title: 'Dan',
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
          { ref: 'new:1', type: 'team', title: 'A', source_memory_ids: ['m-unknown'] },
          { ref: 'new:2', type: 'team', title: 'B' },
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

  it('ignores the relationships and about links a model still returns', () => {
    const parsed = dreamChangeSetSchema.parse({
      facts: [
        {
          ref: 'new:1',
          type: 'preference',
          title: 'Bob prefers tea',
          content: 'Bob prefers tea.',
          about: [existingEntity.id],
          source_memory_ids: ['m-1'],
        },
      ],
      relationships: [{ type: 'member_of', source: existingEntity.id, target: 'entity-team--x' }],
    });

    expect(parsed).not.toHaveProperty('relationships');
    expect(parsed.facts[0]).not.toHaveProperty('about');
    expect(resolveChangeSet(parsed, context()).operations[0]).not.toHaveProperty('about');
  });

  it('rejects each kind the AI index does not build', () => {
    const { operations, rejected } = resolveChangeSet(
      changeSet({
        entities: [{ ref: 'new:1', type: 'person', title: 'Zed', source_memory_ids: ['m-1'] }],
        facts: [
          {
            ref: 'new:2',
            type: 'preference',
            title: 'Zed likes tea',
            content: 'Zed likes tea.',
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
  });
});
