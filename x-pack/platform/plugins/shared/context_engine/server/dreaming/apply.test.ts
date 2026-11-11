/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { KiConflictError, KiNotFoundError } from '../ai_indices/errors';
import { findKiRevision, putKiRevision, type KiRevision } from '../ai_indices/ki_revision';
import { findLinkingRelationshipIds } from '../ai_indices/ki_relationships';
import { softDeleteKi } from '../ai_indices/ki_write';
import { addReferences, applyOperations, type ApplyContext } from './apply';
import type { DreamedKi } from './dreamed_ki';
import type { DreamingOperation } from './resolve_change_set';

jest.mock('../ai_indices/ki_revision', () => ({
  ...jest.requireActual('../ai_indices/ki_revision'),
  findKiRevision: jest.fn(),
  putKiRevision: jest.fn(),
}));
jest.mock('../ai_indices/ki_write', () => ({ softDeleteKi: jest.fn() }));
jest.mock('../ai_indices/ki_relationships', () => ({
  findLinkingRelationshipIds: jest.fn(async () => []),
}));

const writer = { uri: 'workflow://dreaming', metadata: { run_id: 'exec-1' } };

const context = (
  dest: ApplyContext['dest'] = { type: 'index', value: 'ai-index-idx-a' },
  memoryPermissions: ApplyContext['memoryPermissions'] = new Map()
): ApplyContext => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  return { esClient, aiIndexId: 'a', dest, writer, spaceId: 'team-a', memoryPermissions };
};

const restrictedTo = (...groups: Array<{ space: string; name?: string[] }>) => ({
  kibana: { privileges: groups.map((group) => ({ ...group, count: group.name?.length ?? 0 })) },
});

const revisionOf = (source: DreamedKi): KiRevision => ({
  index: 'ai-index-idx-a',
  documentId: source.id,
  seqNo: 3,
  primaryTerm: 1,
  source,
});

const stored = new Map<string, DreamedKi>();
const written = () =>
  jest.mocked(putKiRevision).mock.calls.map(([{ document }]) => document as DreamedKi);

describe('applyOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stored.clear();
    jest.mocked(findKiRevision).mockImplementation(async ({ kiId }) => {
      const source = stored.get(kiId);
      return source ? revisionOf(source) : undefined;
    });
    jest.mocked(putKiRevision).mockResolvedValue(undefined);
  });

  it('cites rounds read from traces as trace://, keeping the permissions of their space', async () => {
    const roundPermissions = { kibana: { privileges: [{ space: 'team-a' }] } };
    const counts = await applyOperations(
      context(undefined, new Map([['trace:51fff8a2', roundPermissions]])),
      [
        {
          op: 'upsert_fact',
          id: 'fact-1',
          type: 'preference',
          title: 'Tom Becker eats vegetarian',
          content: 'Tom Becker always wants vegetarian meals.',
          sourceMemoryIds: ['trace:51fff8a2'],
          lastSeenAt: '2026-11-11T13:12:03.357Z',
        },
      ]
    );

    expect(counts).toEqual(expect.objectContaining({ created: 1, rejected: [] }));
    expect(written()[0]).toEqual(
      expect.objectContaining({
        references: [{ uri: 'trace://51fff8a2', relation: 'derived_from' }],
        attributes: {
          'memory.number_of_occurrences': 1,
          'memory.last_seen_at': '2026-11-11T13:12:03.357Z',
        },
        permissions: roundPermissions,
      })
    );
  });

  it('creates an entity with its attributes, sighting and the memories it came from', async () => {
    const counts = await applyOperations(context(), [
      {
        op: 'upsert_entity',
        id: 'entity-customer-825464',
        type: 'customer',
        title: 'Customer 825464',
        content: 'Nova member in Montreal.',
        attributes: { tier: 'Nova' },
        sourceMemoryIds: ['m-1', 'm-2'],
        lastSeenAt: '2026-11-02T18:40:12.000Z',
      },
    ]);

    expect(counts).toEqual({ created: 1, updated: 0, deleted: 0, rejected: [] });
    expect(putKiRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        kiId: 'entity-customer-825464',
        failIfExists: true,
        refresh: true,
        existing: undefined,
      })
    );
    expect(written()[0]).toEqual(
      expect.objectContaining({
        id: 'entity-customer-825464',
        type: 'entity.customer',
        title: 'Customer 825464',
        content: 'Nova member in Montreal.',
        attributes: {
          tier: 'Nova',
          'memory.number_of_occurrences': 2,
          'memory.last_seen_at': '2026-11-02T18:40:12.000Z',
        },
        references: [
          { uri: 'ki://m-1', relation: 'derived_from' },
          { uri: 'ki://m-2', relation: 'derived_from' },
        ],
        governance: {
          provenance: { created_by: writer, updated_by: writer },
          lifecycle: { status: 'active' },
        },
      })
    );
  });

  it('counts only memories an item does not cite yet, and keeps the latest sighting', async () => {
    stored.set('entity-person-bob', {
      id: 'entity-person-bob',
      type: 'entity.person',
      title: 'Bob',
      content: 'Bob.',
      attributes: {
        role: 'SRE',
        'memory.number_of_occurrences': 1,
        'memory.last_seen_at': '2026-11-03T00:00:00.000Z',
      },
      references: [{ uri: 'ki://m-1', relation: 'derived_from' }],
      governance: { provenance: { created_by: { uri: 'workflow://first', metadata: {} } } },
    });

    const counts = await applyOperations(context(), [
      {
        op: 'upsert_entity',
        id: 'entity-person-bob',
        type: 'person',
        title: 'Bob',
        attributes: {},
        sourceMemoryIds: ['m-1', 'm-2'],
        lastSeenAt: '2026-11-01T00:00:00.000Z',
      },
    ]);

    expect(counts).toEqual({ created: 0, updated: 1, deleted: 0, rejected: [] });
    const [document] = written();
    expect(document.attributes).toEqual({
      role: 'SRE',
      'memory.number_of_occurrences': 2,
      'memory.last_seen_at': '2026-11-03T00:00:00.000Z',
    });
    expect(document.content).toBe('Bob.');
    expect(document.governance?.provenance?.created_by).toEqual({
      uri: 'workflow://first',
      metadata: {},
    });
    expect(putKiRevision).toHaveBeenCalledWith(
      expect.objectContaining({ existing: revisionOf(stored.get('entity-person-bob')!) })
    );
  });

  it('updates a fact, adding the new memory and rendering its access patterns', async () => {
    stored.set('fact-1', {
      id: 'fact-1',
      type: 'fact.preference',
      title: 'Old',
      content: 'Old.',
      references: [{ uri: 'ki://m-1', relation: 'derived_from' }],
    });
    const pattern = {
      question_type: 'member profile',
      esql_template: 'FROM loyalty | WHERE id == ?customer | LIMIT 1',
      esql_example: 'FROM loyalty | WHERE id == 825464 | LIMIT 1',
      returns: 'The member',
    };

    await applyOperations(context(), [
      {
        op: 'upsert_fact',
        id: 'fact-1',
        type: 'preference',
        title: 'Customer 825464 prefers early departures',
        content: 'Customer 825464 prefers early morning departures.',
        accessPatterns: [pattern],
        sourceMemoryIds: ['m-2'],
      },
    ]);

    const [document] = written();
    expect(document.references).toEqual([
      { uri: 'ki://m-1', relation: 'derived_from' },
      { uri: 'ki://m-2', relation: 'derived_from' },
    ]);
    expect(document.content).toBe(
      [
        'Customer 825464 prefers early morning departures.',
        '',
        '## Access patterns',
        '- [member profile] The member',
        '  Template: `FROM loyalty | WHERE id == ?customer | LIMIT 1`',
        '  Example: `FROM loyalty | WHERE id == 825464 | LIMIT 1`',
      ].join('\n')
    );
    expect(document.attributes).toEqual(
      expect.objectContaining({
        esql: [pattern.esql_example],
        access_patterns: [JSON.stringify(pattern)],
        'memory.number_of_occurrences': 2,
      })
    );
  });

  it('appends a new revision to a data stream instead of overwriting', async () => {
    stored.set('entity-person-bob', {
      id: 'entity-person-bob',
      type: 'entity.person',
      title: 'Bob',
    });

    await applyOperations(context({ type: 'data_stream', value: 'ai-index-ds-a' }), [
      {
        op: 'upsert_entity',
        id: 'entity-person-bob',
        type: 'person',
        title: 'Bob',
        attributes: {},
        sourceMemoryIds: ['m-1'],
      },
    ]);

    expect(putKiRevision).toHaveBeenCalledWith(expect.objectContaining({ existing: undefined }));
  });

  it('retries a write that lost to a concurrent one', async () => {
    jest
      .mocked(putKiRevision)
      .mockRejectedValueOnce(new KiConflictError('a', 'entity-team-ops'))
      .mockResolvedValue(undefined);

    const counts = await applyOperations(context(), [
      {
        op: 'upsert_entity',
        id: 'entity-team-ops',
        type: 'team',
        title: 'Ops',
        attributes: {},
        sourceMemoryIds: ['m-1'],
      },
    ]);

    expect(counts.created).toBe(1);
    expect(putKiRevision).toHaveBeenCalledTimes(2);
  });

  it('soft-deletes, and does not count a KI that is already gone', async () => {
    stored.set('fact-1', { id: 'fact-1', type: 'fact.note', title: 'Old' });
    stored.set('fact-2', { id: 'fact-2', type: 'fact.note', title: 'Older' });
    jest
      .mocked(softDeleteKi)
      .mockResolvedValueOnce({ id: 'fact-1', deletedRelationshipIds: [] })
      .mockRejectedValueOnce(new KiNotFoundError('a', 'fact-2'));

    const counts = await applyOperations(context(), [
      { op: 'delete', id: 'fact-1' },
      { op: 'delete', id: 'fact-2' },
      { op: 'delete', id: 'fact-3' },
    ]);

    expect(counts).toEqual({ created: 0, updated: 0, deleted: 1, rejected: [] });
    expect(softDeleteKi).toHaveBeenCalledTimes(2);
    expect(softDeleteKi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kiId: 'fact-1', writer, refresh: true })
    );
  });

  it('makes a KI built from restricted memories visible only in this space, to whoever can see them all', async () => {
    const memoryPermissions = new Map([
      ['m-1', restrictedTo({ space: 'team-a', name: ['ai_index:a/read'] }, { space: 'team-b' })],
      ['m-2', restrictedTo({ space: '*', name: ['ai_index:b/read'] })],
      ['m-3', undefined],
    ]);

    await applyOperations(context(undefined, memoryPermissions), [
      {
        op: 'upsert_fact',
        id: 'fact-1',
        type: 'note',
        title: 'A',
        content: 'A.',
        sourceMemoryIds: ['m-1', 'm-2'],
      },
      {
        op: 'upsert_fact',
        id: 'fact-2',
        type: 'note',
        title: 'B',
        content: 'B.',
        sourceMemoryIds: ['m-3'],
      },
    ]);

    const [restricted, open] = written();
    expect(restricted.permissions).toEqual(
      restrictedTo({ space: 'team-a', name: ['ai_index:a/read', 'ai_index:b/read'] })
    );
    expect(open).not.toHaveProperty('permissions');
  });

  it('gives a KI built from memories with the same permissions exactly those permissions', async () => {
    const shared = restrictedTo({ space: '*', name: ['ai_index:a/read'] });
    const memoryPermissions = new Map([
      ['m-1', shared],
      ['m-2', shared],
    ]);

    await applyOperations(context(undefined, memoryPermissions), [
      {
        op: 'upsert_fact',
        id: 'fact-1',
        type: 'note',
        title: 'A',
        content: 'A.',
        sourceMemoryIds: ['m-1', 'm-2'],
      },
    ]);

    expect(written()[0].permissions).toEqual(shared);
  });

  it('updates an existing KI only from memories with the same permissions', async () => {
    const teamA = restrictedTo({ space: 'team-a', name: ['ai_index:a/read'] });
    const teamB = restrictedTo({ space: 'team-a', name: ['ai_index:b/read'] });
    stored.set('fact-1', { id: 'fact-1', type: 'fact.note', title: 'A', permissions: teamA });
    stored.set('entity-person--bob', {
      id: 'entity-person--bob',
      type: 'entity.person',
      title: 'Bob',
    });
    const memoryPermissions = new Map([
      ['m-a', teamA],
      ['m-b', teamB],
    ]);
    const update = (id: string, sourceMemoryIds: string[]) =>
      id.startsWith('fact')
        ? {
            op: 'upsert_fact' as const,
            id,
            type: 'note',
            title: 'A2',
            content: 'A2.',
            sourceMemoryIds,
          }
        : {
            op: 'upsert_entity' as const,
            id,
            type: 'person',
            title: 'Bob',
            attributes: {},
            sourceMemoryIds,
          };

    const reason = 'it has different permissions than its memories';

    for (const dryRun of [undefined, new Map()]) {
      const counts = await applyOperations({ ...context(undefined, memoryPermissions), dryRun }, [
        update('fact-1', ['m-1']),
        update('fact-1', ['m-b']),
        update('entity-person--bob', ['m-a']),
      ]);

      expect(counts).toEqual({
        created: 0,
        updated: 0,
        deleted: 0,
        rejected: [
          { item: 'fact fact-1', reason },
          { item: 'fact fact-1', reason },
          { item: 'entity entity-person--bob', reason },
        ],
      });
      expect(dryRun?.size ?? 0).toBe(0);
    }
    expect(putKiRevision).not.toHaveBeenCalled();

    await applyOperations(context(undefined, memoryPermissions), [update('fact-1', ['m-a'])]);

    expect(written()[0]).toMatchObject({ title: 'A2', permissions: teamA });
  });

  it('updates a KI that also cites memories from earlier batches, keeping its permissions', async () => {
    const teamA = restrictedTo({ space: '*', name: ['ai_index:a/read'] });
    stored.set('fact-1', {
      id: 'fact-1',
      type: 'fact.note',
      title: 'A',
      references: [{ uri: 'ki://m-old', relation: 'derived_from' }],
      permissions: teamA,
    });
    const fact = (title: string, sourceMemoryIds: string[]) => ({
      op: 'upsert_fact' as const,
      id: 'fact-1',
      type: 'note',
      title,
      content: `${title}.`,
      sourceMemoryIds,
    });

    const counts = await applyOperations(context(undefined, new Map([['m-new', teamA]])), [
      fact('A2', ['m-old']),
      fact('A3', ['m-old', 'm-new']),
    ]);

    expect(counts).toEqual({ created: 0, updated: 2, deleted: 0, rejected: [] });
    expect(written().map(({ title, permissions }) => ({ title, permissions }))).toEqual([
      { title: 'A2', permissions: teamA },
      { title: 'A3', permissions: teamA },
    ]);
  });

  it("changes or deletes only KIs with the permissions of the batch's memories", async () => {
    const teamA = restrictedTo({ space: '*', name: ['ai_index:a/read'] });
    const teamB = restrictedTo({ space: '*', name: ['ai_index:b/read'] });
    stored.set('fact-a', { id: 'fact-a', type: 'fact.note', title: 'A', permissions: teamA });
    stored.set('fact-b', {
      id: 'fact-b',
      type: 'fact.note',
      title: 'B',
      references: [{ uri: 'ki://m-old', relation: 'derived_from' }],
      permissions: teamB,
    });
    jest.mocked(softDeleteKi).mockResolvedValue({ id: 'fact-a', deletedRelationshipIds: [] });
    const memoryPermissions = new Map([['m-a', teamA]]);
    const operations: DreamingOperation[] = [
      {
        op: 'upsert_fact',
        id: 'fact-b',
        type: 'note',
        title: 'B2',
        content: 'B2.',
        sourceMemoryIds: ['m-old'],
      },
      { op: 'delete', id: 'fact-b' },
      { op: 'delete', id: 'fact-a' },
    ];

    for (const dryRun of [new Map(), undefined]) {
      const counts = await applyOperations(
        { ...context(undefined, memoryPermissions), dryRun },
        operations
      );

      expect(counts).toEqual({
        created: 0,
        updated: 0,
        deleted: 1,
        rejected: [
          { item: 'fact fact-b', reason: 'it has different permissions than its memories' },
          {
            item: 'delete fact-b',
            reason: "it has different permissions than this batch's memories",
          },
        ],
      });
    }
    expect(putKiRevision).not.toHaveBeenCalled();
    expect(softDeleteKi).toHaveBeenCalledTimes(1);
    expect(softDeleteKi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kiId: 'fact-a' })
    );
  });

  it('leaves alone a KI this space cannot see', async () => {
    const hidden = restrictedTo({ space: 'team-b' });
    stored.set('entity-team--ops', {
      id: 'entity-team--ops',
      type: 'entity.team',
      title: 'Ops',
      permissions: hidden,
    });
    stored.set('fact-1', { id: 'fact-1', type: 'fact.note', title: 'A', permissions: hidden });

    for (const dryRun of [undefined, new Map()]) {
      const counts = await applyOperations({ ...context(), dryRun }, [
        {
          op: 'upsert_entity',
          id: 'entity-team--ops',
          type: 'team',
          title: 'Ops',
          attributes: {},
          sourceMemoryIds: ['m-1'],
        },
        { op: 'delete', id: 'fact-1' },
      ]);

      expect(counts).toEqual({ created: 0, updated: 0, deleted: 0, rejected: [] });
      expect(dryRun?.size ?? 0).toBe(0);
    }
    expect(putKiRevision).not.toHaveBeenCalled();
    expect(softDeleteKi).not.toHaveBeenCalled();
  });

  describe('relationships', () => {
    const relationship = {
      op: 'upsert_relationship' as const,
      id: 'relationship-1',
      key: 'entity-person--bob|member_of|entity-team--ops',
      relation: 'member_of',
      from: { id: 'entity-person--bob', title: 'Bob' },
      to: { id: 'entity-team--ops', title: 'Ops' },
      description: 'Bob joined Ops in March.',
      sourceMemoryIds: ['m-1'],
    };

    it('writes a relationship with its type, key, ends and memories', async () => {
      const counts = await applyOperations(context(), [relationship]);

      expect(counts).toEqual({ created: 1, updated: 0, deleted: 0, rejected: [] });
      expect(written()[0]).toEqual(
        expect.objectContaining({
          id: 'relationship-1',
          type: 'memory.relationship',
          title: 'Bob member of Ops',
          description: 'Bob joined Ops in March.',
          content: 'Bob member of Ops.\nBob joined Ops in March.',
          attributes: {
            'relationship.relation': 'member_of',
            'memory.key': 'entity-person--bob|member_of|entity-team--ops',
          },
          references: [
            { uri: 'ki://entity-person--bob', relation: 'relates_to', description: 'from' },
            { uri: 'ki://entity-team--ops', relation: 'relates_to', description: 'to' },
            { uri: 'ki://m-1', relation: 'derived_from' },
          ],
        })
      );
    });

    it('leaves a relationship alone when nothing about it changed, and updates it otherwise', async () => {
      await applyOperations(context(), [relationship]);
      stored.set('relationship-1', written()[0]);
      jest.mocked(putKiRevision).mockClear();

      const unchanged = await applyOperations(context(), [relationship]);
      const updated = await applyOperations(context(), [
        { ...relationship, description: 'Bob leads Ops.', sourceMemoryIds: ['m-2'] },
      ]);

      expect(unchanged).toEqual({ created: 0, updated: 0, deleted: 0, rejected: [] });
      expect(updated).toEqual({ created: 0, updated: 1, deleted: 0, rejected: [] });
      expect(written()).toHaveLength(1);
      expect(written()[0]).toMatchObject({
        description: 'Bob leads Ops.',
        content: 'Bob member of Ops.\nBob leads Ops.',
      });
      expect(written()[0].references).toContainEqual({ uri: 'ki://m-1', relation: 'derived_from' });
      expect(written()[0].references).toContainEqual({ uri: 'ki://m-2', relation: 'derived_from' });
    });

    it('rejects an update to a relationship with different permissions than its memories', async () => {
      stored.set('relationship-1', {
        id: 'relationship-1',
        type: 'memory.relationship',
        title: 'Bob member of Ops',
        permissions: restrictedTo({ space: 'team-a', name: ['ai_index:a/read'] }),
      });

      const counts = await applyOperations(context(), [relationship]);

      expect(counts.rejected).toEqual([
        {
          item: 'relationship entity-person--bob member_of entity-team--ops',
          reason: 'it has different permissions than its memories',
        },
      ]);
      expect(putKiRevision).not.toHaveBeenCalled();
    });

    it("rejects a delete of a relationship with different permissions than the batch's memories", async () => {
      stored.set('relationship-1', {
        id: 'relationship-1',
        type: 'memory.relationship',
        title: 'Bob member of Ops',
        permissions: restrictedTo({ space: 'team-a', name: ['ai_index:a/read'] }),
      });

      const counts = await applyOperations(context(), [{ op: 'delete', id: 'relationship-1' }]);

      expect(counts).toEqual({
        created: 0,
        updated: 0,
        deleted: 0,
        rejected: [
          {
            item: 'delete relationship-1',
            reason: "it has different permissions than this batch's memories",
          },
        ],
      });
      expect(softDeleteKi).not.toHaveBeenCalled();
    });

    it('leaves deleting the linked relationships to softDeleteKi', async () => {
      stored.set('entity-person--bob', {
        id: 'entity-person--bob',
        type: 'entity.person',
        title: 'Bob',
      });

      const counts = await applyOperations(context(), [{ op: 'delete', id: 'entity-person--bob' }]);

      expect(counts).toEqual({ created: 0, updated: 0, deleted: 1, rejected: [] });
      expect(jest.mocked(softDeleteKi).mock.calls.map(([, { kiId }]) => kiId)).toEqual([
        'entity-person--bob',
      ]);
      expect(findLinkingRelationshipIds).not.toHaveBeenCalled();
    });

    it('plans the deletes of linked relationships on a dry run', async () => {
      stored.set('fact-1', { id: 'fact-1', type: 'fact.note', title: 'A' });
      jest.mocked(findLinkingRelationshipIds).mockResolvedValueOnce(['relationship-1']);
      const applyContext = context();
      const dryRun = new Map();

      await applyOperations({ ...applyContext, dryRun }, [{ op: 'delete', id: 'fact-1' }]);

      expect(softDeleteKi).not.toHaveBeenCalled();
      expect(findLinkingRelationshipIds).toHaveBeenCalledWith(
        expect.objectContaining({ dest: applyContext.dest, kiId: 'fact-1' })
      );
      expect([...dryRun]).toEqual([
        ['fact-1', { change: 'deleted' }],
        ['relationship-1', { change: 'deleted' }],
      ]);
    });
  });

  it('collects each KI it stores', async () => {
    const collected = new Map();

    await applyOperations({ ...context(), written: collected }, [
      {
        op: 'upsert_fact',
        id: 'fact-2',
        type: 'note',
        title: 'A',
        content: 'A.',
        sourceMemoryIds: ['m-1'],
      },
    ]);

    expect([...collected.keys()]).toEqual(['fact-2']);
    expect(collected.get('fact-2')).toEqual(written()[0]);
  });

  describe('on a dry run', () => {
    const operations = [
      {
        op: 'upsert_entity' as const,
        id: 'entity-team-ops',
        type: 'team',
        title: 'Ops',
        attributes: {},
        sourceMemoryIds: ['m-2'],
      },
      {
        op: 'upsert_fact' as const,
        id: 'fact-2',
        type: 'note',
        title: 'Ops is on call',
        content: 'Ops is on call this week.',
        sourceMemoryIds: ['m-2'],
      },
      {
        op: 'upsert_entity' as const,
        id: 'entity-person-bob',
        type: 'person',
        title: 'Bob',
        content: 'Bob is on the Ops team.',
        attributes: {},
        sourceMemoryIds: ['m-2'],
      },
      { op: 'delete' as const, id: 'fact-1' },
      { op: 'delete' as const, id: 'fact-missing' },
    ];

    beforeEach(() => {
      stored.set('entity-person-bob', {
        id: 'entity-person-bob',
        type: 'entity.person',
        title: 'Bob',
        references: [{ uri: 'ki://m-1', relation: 'derived_from' }],
      });
      stored.set('fact-1', { id: 'fact-1', type: 'fact.note', title: 'Old' });
      jest.mocked(putKiRevision).mockImplementation(async ({ kiId, document }) => {
        stored.set(kiId, document as DreamedKi);
      });
      jest.mocked(softDeleteKi).mockImplementation(async (_, { aiIndexId, kiId }) => {
        if (!stored.has(kiId)) {
          throw new KiNotFoundError(aiIndexId, kiId);
        }
        return { id: kiId, deletedRelationshipIds: [] };
      });
    });

    it('writes nothing, and counts what a real run would', async () => {
      const dryRun = new Map();

      const counts = await applyOperations({ ...context(), dryRun }, operations);

      expect(counts).toEqual(await applyOperations(context(), operations));
      expect(counts).toEqual({ created: 2, updated: 1, deleted: 1, rejected: [] });
      expect(jest.mocked(putKiRevision).mock.calls).toHaveLength(3);
      expect(jest.mocked(softDeleteKi).mock.calls).toHaveLength(1);
    });

    it('reports each KI as it would be stored', async () => {
      const dryRun = new Map();

      await applyOperations({ ...context(), dryRun }, operations);

      expect(putKiRevision).not.toHaveBeenCalled();
      expect(softDeleteKi).not.toHaveBeenCalled();
      expect([...dryRun.keys()]).toEqual([
        'entity-team-ops',
        'fact-2',
        'entity-person-bob',
        'fact-1',
      ]);
      expect(dryRun.get('entity-team-ops')).toEqual({
        change: 'created',
        ki: expect.objectContaining({
          type: 'entity.team',
          title: 'Ops',
          references: [{ uri: 'ki://m-2', relation: 'derived_from' }],
          governance: {
            provenance: { created_by: writer, updated_by: writer },
            lifecycle: { status: 'active' },
          },
        }),
      });
      expect(dryRun.get('fact-2')).toEqual({
        change: 'created',
        ki: expect.objectContaining({ type: 'fact.note', content: 'Ops is on call this week.' }),
      });
      expect(dryRun.get('entity-person-bob')).toEqual({
        change: 'updated',
        ki: expect.objectContaining({
          content: 'Bob is on the Ops team.',
          attributes: { 'memory.number_of_occurrences': 2 },
        }),
      });
      expect(dryRun.get('fact-1')).toEqual({ change: 'deleted' });
    });

    it('reports a KI deleted and then written again as created, as it counts it', async () => {
      const dryRun = new Map();

      const counts = await applyOperations({ ...context(), dryRun }, [
        { op: 'delete', id: 'entity-person-bob' },
        operations[2],
      ]);

      expect(counts).toEqual({ created: 1, updated: 0, deleted: 1, rejected: [] });
      expect(dryRun.get('entity-person-bob')).toEqual(
        expect.objectContaining({ change: 'created' })
      );
    });
  });
});

describe('addReferences', () => {
  const citations = (count: number, from = 0) =>
    Array.from({ length: count }, (_, index) => ({
      uri: `ki://m-${from + index}`,
      relation: 'derived_from' as const,
    }));
  it('adds each memory citation once', () => {
    expect(addReferences(citations(2), citations(2, 1))).toEqual(citations(3));
  });

  it('drops the oldest memory citations when over the cap', () => {
    const references = addReferences(citations(100), citations(1, 100));

    expect(references).toHaveLength(100);
    expect(references).not.toContainEqual({ uri: 'ki://m-0', relation: 'derived_from' });
    expect(references).toContainEqual({ uri: 'ki://m-100', relation: 'derived_from' });
  });

  it('keeps stored relates_to references to one target under different descriptions', () => {
    const relationships = [
      { uri: 'ki://entity-team--ops', relation: 'relates_to' as const, description: 'member_of' },
      { uri: 'ki://entity-team--ops', relation: 'relates_to' as const, description: 'manages' },
    ];

    expect(addReferences(relationships, citations(1))).toEqual([...relationships, ...citations(1)]);
  });
});
