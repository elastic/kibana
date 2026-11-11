/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dreamRelationshipChangeSetSchema,
  type DreamRelationshipChangeSet,
} from '../../common/step_types/apply_dream_relationships';
import type { DreamedKi } from './dreamed_ki';
import { relationshipId, relationshipKey } from './ids';
import type { KiPermissions } from './permissions';
import {
  relationshipRefsOf,
  relationshipTypesOf,
  resolveRelationships,
  type ResolveRelationshipsContext,
} from './resolve_relationships';

const restricted: KiPermissions = {
  kibana: { privileges: [{ space: 'default', name: ['ai_index:support/read'], count: 1 }] },
};

const priya: DreamedKi = {
  id: 'entity-person--priya',
  type: 'entity.person',
  title: 'Priya',
  references: [
    { uri: 'ki://m-1', relation: 'derived_from' },
    { uri: 'ki://m-2', relation: 'derived_from' },
  ],
};

const alex: DreamedKi = {
  id: 'entity-person--alex',
  type: 'entity.person',
  title: 'Alex',
  references: [{ uri: 'ki://m-2', relation: 'derived_from' }],
};

const lyon: DreamedKi = {
  id: 'entity-city--lyon',
  type: 'entity.city',
  title: 'Lyon',
  references: [{ uri: 'ki://m-old', relation: 'derived_from' }],
};

const reviews: DreamedKi = {
  id: 'fact-weekly-review',
  type: 'fact.routine',
  title: 'Priya reviews Alex every Monday',
  references: [{ uri: 'ki://m-2', relation: 'derived_from' }],
};

const managesKey = relationshipKey(priya.id, 'manages', alex.id);
const existingManages: DreamedKi = {
  id: relationshipId(managesKey),
  type: 'memory.relationship',
  title: 'Priya manages Alex',
  description: 'Priya is the team lead Alex reports to.',
};

const context = (
  overrides: Partial<ResolveRelationshipsContext> = {}
): ResolveRelationshipsContext => ({
  relationshipTypes: relationshipTypesOf({
    enabled: true,
    entities: { nodes: [{ type: 'person' }, { type: 'city' }] },
    relationships: [{ type: 'manages' }, { type: 'lives_in' }],
  }),
  memoryPermissions: new Map([
    ['m-1', undefined],
    ['m-2', undefined],
  ]),
  ends: new Map([
    [priya.id, priya],
    [alex.id, alex],
    [lyon.id, lyon],
    [reviews.id, reviews],
  ]),
  existing: new Map(),
  ...overrides,
});

const changeSet = (
  relationships: DreamRelationshipChangeSet['relationships']
): DreamRelationshipChangeSet => dreamRelationshipChangeSetSchema.parse({ relationships });

const manages = { from: priya.id, relation: 'manages', to: alex.id };

describe('relationshipRefsOf', () => {
  it('lists the ends and relationship ids a change set names, once each', () => {
    expect(
      relationshipRefsOf(
        changeSet([
          { ...manages, description: 'A' },
          { ...manages, description: 'B' },
          { from: alex.id, relation: 'lives_in', to: lyon.id, description: 'C' },
        ])
      )
    ).toEqual({
      ends: [priya.id, alex.id, lyon.id],
      relationships: [
        existingManages.id,
        relationshipId(relationshipKey(alex.id, 'lives_in', lyon.id)),
      ],
    });
  });
});

describe('resolveRelationships', () => {
  it('links two ends, based on the batch memories both cite', () => {
    expect(
      resolveRelationships(changeSet([{ ...manages, description: 'Priya leads Alex.' }]), context())
    ).toEqual({
      operations: [
        {
          op: 'upsert_relationship',
          id: existingManages.id,
          key: managesKey,
          relation: 'manages',
          from: { id: priya.id, title: 'Priya' },
          to: { id: alex.id, title: 'Alex' },
          description: 'Priya leads Alex.',
          sourceMemoryIds: ['m-2'],
        },
      ],
      rejected: [],
    });
  });

  it('falls back to the batch memories either end cites', () => {
    const { operations } = resolveRelationships(
      changeSet([{ from: priya.id, relation: 'lives_in', to: lyon.id, description: 'In Lyon.' }]),
      context()
    );

    expect(operations).toEqual([expect.objectContaining({ sourceMemoryIds: ['m-1', 'm-2'] })]);
  });

  it('links a fact to an entity it is about with the built-in about type', () => {
    const { operations, rejected } = resolveRelationships(
      changeSet([{ from: reviews.id, relation: 'about', to: alex.id, description: 'Alex.' }]),
      context()
    );

    expect(rejected).toEqual([]);
    expect(operations).toEqual([
      expect.objectContaining({
        relation: 'about',
        key: relationshipKey(reviews.id, 'about', alex.id),
        sourceMemoryIds: ['m-2'],
      }),
    ]);
  });

  it('rejects a relationship listed twice, keeping the first', () => {
    const { operations, rejected } = resolveRelationships(
      changeSet([
        { ...manages, description: 'First.' },
        { ...manages, description: 'Second.' },
      ]),
      context()
    );

    expect(operations).toEqual([expect.objectContaining({ description: 'First.' })]);
    expect(rejected).toEqual([
      { item: `relationship ${priya.id} manages ${alex.id}`, reason: 'is listed twice' },
    ]);
  });

  it('keeps the current description when an update leaves it out', () => {
    const { operations } = resolveRelationships(
      changeSet([manages]),
      context({ existing: new Map([[existingManages.id, existingManages]]) })
    );

    expect(operations).toEqual([
      expect.objectContaining({ description: existingManages.description }),
    ]);
  });

  it('deletes an existing relationship', () => {
    expect(
      resolveRelationships(
        changeSet([{ ...manages, delete: true }]),
        context({ existing: new Map([[existingManages.id, existingManages]]) })
      )
    ).toEqual({ operations: [{ op: 'delete', id: existingManages.id }], rejected: [] });
  });

  it.each([
    [
      'an AI index without relationship types',
      { ...manages, description: 'D' },
      { relationshipTypes: new Set<string>() },
      'this AI index does not build relationships',
    ],
    [
      'a type that is not configured',
      { from: priya.id, relation: 'knows', to: alex.id, description: 'D' },
      {},
      "relationship type 'knows' is not configured",
    ],
    [
      'an item linked to itself',
      { from: priya.id, relation: 'manages', to: priya.id, description: 'D' },
      {},
      'links an item to itself',
    ],
    [
      'an end that is not a known fact or entity',
      { from: priya.id, relation: 'manages', to: 'entity-person--zoe', description: 'D' },
      {},
      "'entity-person--zoe' is not an existing fact or entity",
    ],
    [
      'about from an entity',
      { from: priya.id, relation: 'about', to: alex.id, description: 'D' },
      {},
      "'about' links a fact to an entity",
    ],
    [
      'a configured type from a fact',
      { from: reviews.id, relation: 'manages', to: alex.id, description: 'D' },
      {},
      "'manages' links two entities; a fact links with 'about'",
    ],
    [
      'deleting a relationship that does not exist',
      { ...manages, delete: true },
      {},
      'only an existing relationship can be deleted',
    ],
    [
      'a new relationship without a description',
      manages,
      {},
      'a new relationship needs a description',
    ],
    [
      'ends not based on these memories',
      { ...manages, description: 'D' },
      { memoryPermissions: new Map([['m-9', undefined]]) },
      'neither end is based on these memories',
    ],
    [
      'an end with other permissions than its memories',
      { ...manages, description: 'D' },
      {
        memoryPermissions: new Map<string, KiPermissions | undefined>([
          ['m-1', restricted],
          ['m-2', restricted],
        ]),
        ends: new Map([
          [priya.id, { ...priya, permissions: restricted }],
          [alex.id, alex],
        ]),
      },
      `'${alex.id}' has different permissions than the memories behind it`,
    ],
  ])('rejects %s', (_, relationship, overrides, reason) => {
    const { from, relation, to } = relationship;

    expect(resolveRelationships(changeSet([relationship]), context(overrides))).toEqual({
      operations: [],
      rejected: [{ item: `relationship ${from} ${relation} ${to}`, reason }],
    });
  });
});
