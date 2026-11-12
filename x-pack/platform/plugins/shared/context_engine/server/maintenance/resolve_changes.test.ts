/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceChangeSet } from '../../common/step_types/apply_maintenance_changes';
import type {
  MaintenanceBatch,
  MaintenanceReviewItem,
} from '../../common/step_types/gather_maintenance';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { relationshipId, relationshipKey } from '../dreaming/ids';
import { toMaintenanceItem } from './gather';
import { resolveMaintenanceChanges, type ResolvedMaintenance } from './resolve_changes';

const personEdited = { 'memory.edited_by': 'api://context_engine.ki.update' };
const restricted = { kibana: { privileges: [{ space: 'default', name: ['a'], count: 1 }] } };
const derivedFrom = (...ids: string[]) =>
  ids.map((id) => ({ uri: `ki://${id}`, relation: 'derived_from' as const }));

const fact = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'fact.plan',
  title: `Fact ${id}`,
  content: `Fact ${id}.`,
  references: derivedFrom(`m-${id}`),
  attributes: { 'memory.number_of_occurrences': 1 },
  ...overrides,
});

const entity = (id: string, overrides: Partial<DreamedKi> = {}): DreamedKi => ({
  id,
  type: 'entity.person',
  title: `Entity ${id}`,
  references: derivedFrom(`m-${id}`),
  ...overrides,
});

const link = (from: string, relation: string, to: string): DreamedKi => {
  const key = relationshipKey(from, relation, to);
  return {
    id: relationshipId(key),
    type: 'memory.relationship',
    title: `${from} ${relation} ${to}`,
    attributes: { 'memory.key': key, 'relationship.relation': relation },
    references: [
      { uri: `ki://${from}`, relation: 'relates_to', description: 'from' },
      { uri: `ki://${to}`, relation: 'relates_to', description: 'to' },
      ...derivedFrom('m-link'),
    ],
  };
};

const changeSet = (changes: Partial<MaintenanceChangeSet>): MaintenanceChangeSet => ({
  merges: [],
  contradictions: [],
  rewrites: [],
  summaries: [],
  relationships: [],
  ...changes,
});

const resolve = (
  kis: DreamedKi[],
  changes: Partial<MaintenanceChangeSet>,
  {
    items = kis.filter(({ type }) => type !== 'memory.relationship').map(({ id }) => id),
    extra = {},
    links = {},
    relationships = [],
  }: {
    items?: string[];
    extra?: Record<string, Partial<MaintenanceReviewItem>>;
    links?: Record<string, DreamedKi[]>;
    relationships?: MaintenanceBatch['relationships'];
  } = {}
): ResolvedMaintenance => {
  const byId = new Map(kis.map((ki) => [ki.id, ki]));
  const batch: MaintenanceBatch = {
    audience: 'open',
    items: items.map((id) => ({
      ...toMaintenanceItem(byId.get(id)!),
      reasons: ['changed'],
      ...extra[id],
    })),
    neighbors: [],
    about_facts: [],
    relationships,
  };
  return resolveMaintenanceChanges(changeSet(changes), {
    batch,
    kis: byId,
    links: new Map(Object.entries(links)),
    spaceId: 'default',
  });
};

const build = (resolved: ResolvedMaintenance, kis: DreamedKi[], group = 0, write = 0) => {
  const { id, build: buildDocument } = resolved.groups[group].writes[write];
  return buildDocument(kis.find((ki) => ki.id === id));
};

describe('resolveMaintenanceChanges', () => {
  describe('merges', () => {
    it('keeps the survivor with the memories, sightings and text, superseding the others', () => {
      const kis = [
        entity('e-1', {
          attributes: {
            'memory.number_of_occurrences': 2,
            'memory.last_seen_at': '2026-11-01T00:00:00.000Z',
          },
        }),
        entity('e-2', {
          attributes: {
            role: 'SRE',
            'memory.number_of_occurrences': 3,
            'memory.last_seen_at': '2026-11-05T00:00:00.000Z',
          },
        }),
      ];

      const resolved = resolve(kis, {
        merges: [
          { survivor: 'e-1', absorbed: ['e-2'], content: 'Bob, an SRE.', reason: 'Same Bob' },
        ],
      });

      expect(resolved.groups[0]).toEqual(
        expect.objectContaining({
          tombstones: ['e-2'],
          changes: [
            { id: 'e-1', change: 'merged', reason: 'Same Bob' },
            { id: 'e-2', change: 'superseded', reason: 'Merged into e-1: Same Bob' },
          ],
        })
      );
      expect(build(resolved, kis)).toEqual(
        expect.objectContaining({
          content: 'Bob, an SRE.',
          attributes: {
            role: 'SRE',
            'memory.number_of_occurrences': 5,
            'memory.last_seen_at': '2026-11-05T00:00:00.000Z',
          },
          references: [
            ...derivedFrom('m-e-1', 'm-e-2'),
            { uri: 'ki://e-2', relation: 'supersedes' },
          ],
        })
      );
    });

    it('moves the relationships of the absorbed items, skipping links to itself', () => {
      const kis = [entity('e-1'), entity('e-2'), entity('e-3')];
      const knows = link('e-2', 'knows', 'e-3');
      const self = link('e-2', 'knows', 'e-1');

      const resolved = resolve(
        kis,
        { merges: [{ survivor: 'e-1', absorbed: ['e-2'], reason: 'Same' }] },
        { items: ['e-1', 'e-2'], links: { 'e-2': [knows, self] } }
      );

      const key = relationshipKey('e-1', 'knows', 'e-3');
      expect(resolved.groups[0].moves).toEqual([
        {
          id: relationshipId(key),
          document: expect.objectContaining({
            type: 'memory.relationship',
            title: 'Entity e-1 knows Entity e-3',
            attributes: { 'memory.key': key, 'relationship.relation': 'knows' },
            references: [
              { uri: 'ki://e-1', relation: 'relates_to', description: 'from' },
              { uri: 'ki://e-3', relation: 'relates_to', description: 'to' },
              ...derivedFrom('m-link'),
            ],
          }),
        },
      ]);
    });

    it('moves relationships to what another change keeps of their other end, with new titles', () => {
      const kis = [
        entity('e-1'),
        entity('e-2'),
        entity('e-3'),
        entity('e-4'),
        entity('e-gone', { governance: { lifecycle: { status: 'deleted' } } }),
        fact('f-old', { attributes: { 'memory.last_seen_at': '2026-01-01T00:00:00.000Z' } }),
        fact('f-new', { attributes: { 'memory.last_seen_at': '2026-05-01T00:00:00.000Z' } }),
      ];
      const toAbsorbed = link('e-2', 'knows', 'e-4');
      const toDeleted = link('e-2', 'knows', 'e-gone');
      const toLoser = link('e-2', 'about', 'f-old');

      const resolved = resolve(
        kis,
        {
          merges: [
            { survivor: 'e-1', absorbed: ['e-2'], title: 'Bob', reason: 'Same' },
            { survivor: 'e-3', absorbed: ['e-4'], title: 'Alex', reason: 'Same' },
          ],
          contradictions: [{ ids: ['f-old', 'f-new'], label: 'conflict', reason: 'Both claim' }],
        },
        {
          items: ['e-1', 'e-2', 'e-3', 'e-4', 'f-old', 'f-new'],
          links: { 'e-2': [toAbsorbed, toDeleted, toLoser], 'e-4': [toAbsorbed] },
        }
      );

      const moved = relationshipId(relationshipKey('e-1', 'knows', 'e-3'));
      expect(resolved.groups[0].moves).toEqual([
        { id: moved, document: expect.objectContaining({ title: 'Bob knows Alex' }) },
      ]);
      expect(resolved.groups[1].moves.map(({ id }) => id)).toEqual([moved]);
    });

    it('counts a memory that more than one merged item came from once', () => {
      const kis = [
        entity('e-1', {
          references: derivedFrom('m-1', 'm-2'),
          attributes: { 'memory.number_of_occurrences': 2 },
        }),
        entity('e-2', {
          references: derivedFrom('m-2', 'm-3'),
          attributes: { 'memory.number_of_occurrences': 2 },
        }),
      ];

      const resolved = resolve(kis, {
        merges: [{ survivor: 'e-1', absorbed: ['e-2'], reason: 'Same' }],
      });

      expect(build(resolved, kis)?.attributes).toEqual(
        expect.objectContaining({ 'memory.number_of_occurrences': 3 })
      );
    });

    it('keeps the person-edited item, and leaves a group with two for review', () => {
      const kis = [
        entity('e-1'),
        entity('e-2', { attributes: personEdited }),
        entity('e-3', { attributes: personEdited }),
      ];

      const swapped = resolve(kis, {
        merges: [{ survivor: 'e-1', absorbed: ['e-2'], reason: 'Same' }],
      });
      const twoEdited = resolve(kis, {
        merges: [{ survivor: 'e-2', absorbed: ['e-3'], reason: 'Same' }],
      });

      expect(swapped.groups[0].writes[0].id).toBe('e-2');
      expect(swapped.groups[0].tombstones).toEqual(['e-1']);
      expect(twoEdited.groups).toEqual([]);
      expect(twoEdited.needsReview.map(({ id }) => id)).toEqual(['e-2', 'e-3']);
    });

    it('rejects items outside the batch or its audience, mixed kinds, and items changed twice', () => {
      const kis = [
        entity('e-1'),
        entity('e-2'),
        entity('e-3', { permissions: restricted }),
        fact('f-1'),
      ];

      const resolved = resolve(kis, {
        merges: [
          { survivor: 'e-1', absorbed: ['e-9'], reason: 'r' },
          { survivor: 'e-1', absorbed: ['e-3'], reason: 'r' },
          { survivor: 'e-1', absorbed: ['f-1'], reason: 'r' },
          { survivor: 'e-1', absorbed: ['e-2'], reason: 'r' },
          { survivor: 'e-2', absorbed: ['e-1'], reason: 'r' },
        ],
      });

      expect(resolved.groups).toHaveLength(1);
      expect(resolved.rejected.map(({ reason }) => reason)).toEqual([
        'e-9 is not in the batch',
        'e-3 has different permissions than the batch',
        'facts and entities cannot be merged together',
        'e-2 is already changed by another change',
      ]);
    });
  });

  describe('contradictions', () => {
    const older = fact('f-old', {
      content: 'Plan is Basic.',
      attributes: {
        'memory.number_of_occurrences': 4,
        'memory.last_seen_at': '2026-02-01T00:00:00.000Z',
      },
    });
    const newer = fact('f-new', {
      content: 'Plan is Pro.',
      attributes: {
        'memory.number_of_occurrences': 1,
        'memory.last_seen_at': '2026-05-01T00:00:00.000Z',
      },
    });

    it('merges a value that changed into the newer fact, with its history', () => {
      const resolved = resolve([older, newer], {
        contradictions: [
          {
            ids: ['f-old', 'f-new'],
            label: 'changed',
            content: 'Plan is Pro as of May 2026, up from Basic in February 2026.',
            reason: 'Upgraded',
          },
        ],
      });

      expect(resolved.groups[0].tombstones).toEqual(['f-old']);
      expect(build(resolved, [older, newer])).toEqual(
        expect.objectContaining({
          id: 'f-new',
          content: 'Plan is Pro as of May 2026, up from Basic in February 2026.',
          references: [
            ...derivedFrom('m-f-new', 'm-f-old'),
            { uri: 'ki://f-old', relation: 'supersedes' },
          ],
        })
      );
    });

    it('rejects a value that changed without what the newer fact now says', () => {
      const resolved = resolve([older, newer], {
        contradictions: [{ ids: ['f-old', 'f-new'], label: 'changed', reason: 'Upgraded' }],
      });

      expect(resolved.groups).toEqual([]);
      expect(resolved.rejected).toEqual([
        {
          item: 'contradiction between f-old and f-new',
          reason: 'a changed fact needs the content the newer one keeps',
        },
      ]);
    });

    it('keeps the fact seen last in a conflict, with only its own text and sources', () => {
      const resolved = resolve([older, newer], {
        contradictions: [{ ids: ['f-new', 'f-old'], label: 'conflict', reason: 'Both claim' }],
      });

      expect(resolved.groups[0].tombstones).toEqual(['f-old']);
      expect(resolved.groups[0].changes).toEqual([
        { id: 'f-old', change: 'superseded', reason: 'Conflicts with f-new: Both claim' },
      ]);
      expect(build(resolved, [older, newer])).toEqual(
        expect.objectContaining({
          content: 'Plan is Pro.',
          references: [...derivedFrom('m-f-new'), { uri: 'ki://f-old', relation: 'supersedes' }],
        })
      );
    });

    it('never lets a person-edited fact lose, leaving the pair for review', () => {
      const edited = { ...older, attributes: { ...older.attributes, ...personEdited } };

      const resolved = resolve([edited, newer], {
        contradictions: [{ ids: ['f-old', 'f-new'], label: 'conflict', reason: 'Both claim' }],
      });

      expect(resolved.groups).toEqual([]);
      expect(resolved.needsReview.map(({ id }) => id)).toEqual(['f-old', 'f-new']);
    });

    it('only settles contradictions between facts', () => {
      const resolved = resolve([entity('e-1'), entity('e-2')], {
        contradictions: [{ ids: ['e-1', 'e-2'], label: 'conflict', reason: 'r' }],
      });

      expect(resolved.rejected).toEqual([
        {
          item: 'contradiction between e-1 and e-2',
          reason: 'only facts can contradict each other',
        },
      ]);
    });
  });

  it('rewrites an item that lost memories, dropping them from its sources', () => {
    const kis = [fact('f-1', { references: derivedFrom('m-1', 'm-2') }), fact('f-2')];

    const resolved = resolve(
      kis,
      {
        rewrites: [
          { id: 'f-1', content: 'From m-2 only.', reason: 'm-1 deleted' },
          { id: 'f-2', content: 'Nope.', reason: 'r' },
        ],
      },
      { extra: { 'f-1': { lost_source_ids: ['m-1'] } } }
    );

    expect(build(resolved, kis)).toEqual(
      expect.objectContaining({ content: 'From m-2 only.', references: derivedFrom('m-2') })
    );
    expect(resolved.rejected).toEqual([
      { item: 'rewrite of f-2', reason: 'f-2 did not lose any memories' },
    ]);
  });

  it('refreshes the summary of a reviewed entity that no person edited', () => {
    const kis = [entity('e-1'), entity('e-2', { attributes: personEdited })];

    const resolved = resolve(kis, {
      summaries: [
        { id: 'e-1', content: 'Bob runs on-call.', reason: 'New facts' },
        { id: 'e-2', content: 'Overwrite.', reason: 'r' },
      ],
    });

    expect(build(resolved, kis)).toEqual(expect.objectContaining({ content: 'Bob runs on-call.' }));
    expect(resolved.rejected).toEqual([{ item: 'summary of e-2', reason: 'a person edited it' }]);
  });

  it('removes a relationship only when another links the same two items', () => {
    const knows = link('e-1', 'knows', 'e-2');
    const inverse = link('e-2', 'knows', 'e-1');
    const lonely = link('e-1', 'manages', 'e-3');
    const kis = [entity('e-1'), entity('e-2'), knows, inverse, lonely];
    const listed = [knows, inverse, lonely].map(({ id, attributes }) => {
      const [from, relation, to] = String(attributes?.['memory.key']).split('|');
      return { id, from, relation, to };
    });

    const resolved = resolve(
      kis,
      {
        relationships: [
          { id: inverse.id, reason: 'Inverse of knows' },
          { id: knows.id, reason: 'Inverse too' },
          { id: lonely.id, reason: 'r' },
        ],
      },
      { relationships: listed }
    );

    expect(resolved.groups.map(({ tombstones }) => tombstones)).toEqual([[inverse.id]]);
    expect(resolved.rejected.map(({ reason }) => reason)).toEqual([
      'it is neither a duplicate nor the inverse of another',
      'it is neither a duplicate nor the inverse of another',
    ]);
  });
});
