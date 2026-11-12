/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LAST_SEEN_AT_ATTRIBUTE,
  OCCURRENCES_ATTRIBUTE,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
} from '../../common/dreaming';
import type { MaintenanceChangeSet } from '../../common/step_types/apply_maintenance_changes';
import type {
  MaintenanceBatch,
  MaintenanceChange,
} from '../../common/step_types/gather_maintenance';
import { isKiDeleted } from '../ai_indices/ki_revision';
import { isPersonEdited } from '../ai_indices/ki_write';
import {
  accessPatternsOf,
  renderContent,
  withoutAccessPatternAttributes,
} from '../dreaming/access_patterns';
import {
  addReferences,
  relationshipContent,
  relationshipTitle,
  type BuildDocument,
} from '../dreaming/apply';
import {
  kindOf,
  occurrencesOf,
  type DreamedKi,
  type DreamedKiReference,
} from '../dreaming/dreamed_ki';
import { kiUri, relationshipId, relationshipKey } from '../dreaming/ids';
import { derivedPermissions, isVisibleInSpace } from '../dreaming/permissions';
import { audienceOf, parseRelationship } from './gather';

/** The writes of one change, in order: they stand or fall together. */
export interface MaintenanceGroup {
  /** Which change of the change set, for rejections. */
  item: string;
  /** Written first: the item that is kept. */
  writes: Array<{ id: string; build: BuildDocument }>;
  /** Written next: relationships moved from tombstoned items to the kept one. */
  moves: Array<{ id: string; document: Omit<DreamedKi, 'governance'> }>;
  /** Tombstoned last, with the relationships that still link them. */
  tombstones: string[];
  changes: MaintenanceChange[];
}

export interface ResolveMaintenanceContext {
  batch: MaintenanceBatch;
  /** The newest revision of each KI the batch and the change set name, and of their links' ends. */
  kis: ReadonlyMap<string, DreamedKi>;
  /** The relationships that link each item, by item id. */
  links: ReadonlyMap<string, readonly DreamedKi[]>;
  spaceId: string;
}

export interface ResolvedMaintenance {
  groups: MaintenanceGroup[];
  needsReview: MaintenanceChange[];
  rejected: Array<{ item: string; reason: string }>;
}

interface Text {
  title?: string;
  description?: string;
  content?: string;
}

const timeOf = (value: unknown): number => {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const lastSeenOf = (ki: DreamedKi): number =>
  timeOf(ki.attributes?.[LAST_SEEN_AT_ATTRIBUTE] ?? ki.updated_at);

const latestSeen = (kis: readonly DreamedKi[]): string | undefined => {
  const newest = Math.max(...kis.map(lastSeenOf));
  return newest > 0 ? new Date(newest).toISOString() : undefined;
};

const withText = (current: DreamedKi, { title, description, content }: Text) => ({
  ...(title !== undefined && { title }),
  ...(description !== undefined && { description }),
  ...(content !== undefined && { content: renderContent(content, accessPatternsOf(current)) }),
});

const memoryUrisOf = (ki: DreamedKi): string[] =>
  (ki.references ?? []).filter(({ relation }) => relation === 'derived_from').map(({ uri }) => uri);

/** Sums the sightings, counting a memory more than one of them came from only once. */
const mergedOccurrences = (current: DreamedKi, absorbed: readonly DreamedKi[]): number => {
  const seen = new Set(memoryUrisOf(current));
  let total = occurrencesOf(current);
  for (const ki of absorbed) {
    const uris = memoryUrisOf(ki);
    total += Math.max(occurrencesOf(ki) - uris.filter((uri) => seen.has(uri)).length, 0);
    uris.forEach((uri) => seen.add(uri));
  }
  return total;
};

/** The kept item takes the memories and sightings of the others, and supersedes each. */
const mergeInto =
  (absorbed: readonly DreamedKi[], text: Text): BuildDocument =>
  (current) => {
    if (!current) {
      return undefined;
    }
    const lastSeenAt = latestSeen([current, ...absorbed]);
    return {
      ...current,
      ...withText(current, text),
      attributes: {
        ...Object.assign(
          {},
          ...absorbed.map(({ attributes }) => withoutAccessPatternAttributes(attributes))
        ),
        ...current.attributes,
        [OCCURRENCES_ATTRIBUTE]: mergedOccurrences(current, absorbed),
        ...(lastSeenAt !== undefined && { [LAST_SEEN_AT_ATTRIBUTE]: lastSeenAt }),
      },
      references: addReferences(current.references, [
        ...absorbed.flatMap(({ references }) =>
          (references ?? []).filter(({ relation }) => relation === 'derived_from')
        ),
        ...absorbed.map(
          ({ id }): DreamedKiReference => ({ uri: kiUri(id), relation: 'supersedes' })
        ),
      ]),
    };
  };

const supersede =
  (loser: DreamedKi): BuildDocument =>
  (current) =>
    current && {
      ...current,
      references: addReferences(current.references, [
        { uri: kiUri(loser.id), relation: 'supersedes' },
      ]),
    };

const rewrite =
  (text: Text, lostIds: readonly string[]): BuildDocument =>
  (current) => {
    if (!current) {
      return undefined;
    }
    const lost = new Set(lostIds.map(kiUri));
    return {
      ...current,
      ...withText(current, text),
      references: (current.references ?? []).filter(
        ({ uri, relation }) => !(relation === 'derived_from' && lost.has(uri))
      ),
    };
  };

/** Resolves a maintenance change set against the batch it was proposed for. */
export const resolveMaintenanceChanges = (
  changeSet: MaintenanceChangeSet,
  { batch, kis, links, spaceId }: ResolveMaintenanceContext
): ResolvedMaintenance => {
  const groups: MaintenanceGroup[] = [];
  const needsReview: MaintenanceChange[] = [];
  const rejected: Array<{ item: string; reason: string }> = [];
  const reviewed = new Map(batch.items.map((item) => [item.id, item]));
  const shown = new Set([...reviewed.keys(), ...batch.neighbors.map(({ id }) => id)]);
  const claimed = new Set<string>();

  const problemWith = (ids: readonly string[]): string | undefined => {
    for (const id of ids) {
      const ki = kis.get(id);
      if (!shown.has(id)) {
        return `${id} is not in the batch`;
      }
      if (claimed.has(id)) {
        return `${id} is already changed by another change`;
      }
      if (
        !ki ||
        isKiDeleted(ki) ||
        kindOf(ki) === undefined ||
        !isVisibleInSpace(ki.permissions, spaceId)
      ) {
        return `${id} no longer exists`;
      }
      if (audienceOf(ki) !== batch.audience) {
        return `${id} has different permissions than the batch`;
      }
    }
    if (new Set(ids).size !== ids.length) {
      return 'an item is named twice';
    }
    return undefined;
  };

  const kiOf = (id: string): DreamedKi => kis.get(id) as DreamedKi;

  const absorbedInto = new Map<string, string>();
  const retitled = new Map<string, string>();
  const discarded = new Set<string>();
  const pendingMoves: Array<{ group: MaintenanceGroup; absorbed: readonly DreamedKi[] }> = [];

  /** Relationships of the absorbed items, re-pointed at what is kept of each end. */
  const movesOf = (absorbed: readonly DreamedKi[]) => {
    const moves = new Map<string, Omit<DreamedKi, 'governance'>>();
    const keptKiOf = (id: string): DreamedKi | undefined => {
      const ki = kis.get(id);
      const title = retitled.get(id);
      return ki && title !== undefined ? { ...ki, title } : ki;
    };
    for (const link of absorbed.flatMap(({ id }) => links.get(id) ?? [])) {
      const parsed = parseRelationship(link);
      if (!parsed) {
        continue;
      }
      const fromId = absorbedInto.get(parsed.from) ?? parsed.from;
      const toId = absorbedInto.get(parsed.to) ?? parsed.to;
      const from = keptKiOf(fromId);
      const to = keptKiOf(toId);
      const key = relationshipKey(fromId, parsed.relation, toId);
      const id = relationshipId(key);
      if (
        fromId === toId ||
        !from ||
        !to ||
        isKiDeleted(from) ||
        isKiDeleted(to) ||
        discarded.has(fromId) ||
        discarded.has(toId) ||
        id === link.id ||
        moves.has(id)
      ) {
        continue;
      }
      const title = relationshipTitle({ from, relation: parsed.relation, to });
      const permissions = derivedPermissions([from.permissions, to.permissions], spaceId);
      moves.set(id, {
        id,
        type: RELATIONSHIP_KI_TYPE,
        title,
        ...(link.description !== undefined && { description: link.description }),
        content: relationshipContent(title, link.description),
        attributes: { ...link.attributes, [RELATIONSHIP_KEY_ATTRIBUTE]: key },
        references: addReferences(
          [
            { uri: kiUri(fromId), relation: 'relates_to', description: 'from' },
            { uri: kiUri(toId), relation: 'relates_to', description: 'to' },
          ],
          (link.references ?? []).filter(({ relation }) => relation === 'derived_from')
        ),
        ...(permissions && { permissions }),
      });
    }
    return [...moves].map(([id, document]) => ({ id, document }));
  };

  const merge = (
    item: string,
    survivor: DreamedKi,
    absorbed: DreamedKi[],
    text: Text,
    reason: string
  ) => {
    [survivor, ...absorbed].forEach(({ id }) => claimed.add(id));
    absorbed.forEach(({ id }) => absorbedInto.set(id, survivor.id));
    if (text.title !== undefined) {
      retitled.set(survivor.id, text.title);
    }
    const group: MaintenanceGroup = {
      item,
      writes: [{ id: survivor.id, build: mergeInto(absorbed, text) }],
      moves: [],
      tombstones: absorbed.map(({ id }) => id),
      changes: [
        { id: survivor.id, change: 'merged', reason },
        ...absorbed.map(
          ({ id }): MaintenanceChange => ({
            id,
            change: 'superseded',
            reason: `Merged into ${survivor.id}: ${reason}`,
          })
        ),
      ],
    };
    groups.push(group);
    pendingMoves.push({ group, absorbed });
  };

  const leaveForReview = (ids: readonly string[], reason: string) => {
    ids.forEach((id) => claimed.add(id));
    needsReview.push(
      ...ids.map((id): MaintenanceChange => ({ id, change: 'needs_review', reason }))
    );
  };

  for (const { survivor: survivorId, absorbed: absorbedIds, reason, ...text } of changeSet.merges) {
    const item = `merge into ${survivorId}`;
    const ids = [survivorId, ...absorbedIds];
    const problem = problemWith(ids);
    if (problem) {
      rejected.push({ item, reason: problem });
      continue;
    }
    const group = ids.map(kiOf);
    if (new Set(group.map(kindOf)).size > 1) {
      rejected.push({ item, reason: 'facts and entities cannot be merged together' });
      continue;
    }
    const edited = group.filter((ki) => isPersonEdited(ki));
    if (edited.length > 1) {
      leaveForReview(
        ids,
        `They look like duplicates, but a person edited more than one: ${reason}`
      );
      continue;
    }
    const survivor = edited[0] ?? kiOf(survivorId);
    merge(
      item,
      survivor,
      group.filter(({ id }) => id !== survivor.id),
      text,
      reason
    );
  }

  for (const { ids, label, content, reason } of changeSet.contradictions) {
    const item = `contradiction between ${ids[0]} and ${ids[1]}`;
    const problem = problemWith(ids);
    if (problem) {
      rejected.push({ item, reason: problem });
      continue;
    }
    const pair = ids.map(kiOf);
    if (pair.some((ki) => kindOf(ki) !== 'fact')) {
      rejected.push({ item, reason: 'only facts can contradict each other' });
      continue;
    }
    const [winner, loser] = [...pair].sort(
      (a, b) => lastSeenOf(b) - lastSeenOf(a) || occurrencesOf(b) - occurrencesOf(a)
    );
    if (isPersonEdited(loser)) {
      leaveForReview(
        ids,
        `They contradict each other, and a person edited the older one: ${reason}`
      );
      continue;
    }
    if (label === 'changed') {
      if (content === undefined) {
        rejected.push({ item, reason: 'a changed fact needs the content the newer one keeps' });
        continue;
      }
      merge(item, winner, [loser], { content }, reason);
      continue;
    }
    claimed.add(winner.id);
    claimed.add(loser.id);
    discarded.add(loser.id);
    groups.push({
      item,
      writes: [{ id: winner.id, build: supersede(loser) }],
      moves: [],
      tombstones: [loser.id],
      changes: [
        { id: loser.id, change: 'superseded', reason: `Conflicts with ${winner.id}: ${reason}` },
      ],
    });
  }

  for (const { id, title, content, reason } of changeSet.rewrites) {
    const item = `rewrite of ${id}`;
    const lostIds = reviewed.get(id)?.lost_source_ids;
    const problem = lostIds ? problemWith([id]) : `${id} did not lose any memories`;
    if (problem) {
      rejected.push({ item, reason: problem });
      continue;
    }
    if (isPersonEdited(kiOf(id))) {
      rejected.push({ item, reason: 'a person edited it' });
      continue;
    }
    claimed.add(id);
    groups.push({
      item,
      writes: [{ id, build: rewrite({ title, content }, lostIds ?? []) }],
      moves: [],
      tombstones: [],
      changes: [{ id, change: 'rewritten', reason }],
    });
  }

  for (const { id, description, content, reason } of changeSet.summaries) {
    const item = `summary of ${id}`;
    const problem =
      reviewed.get(id)?.kind === 'entity' ? problemWith([id]) : `${id} is not a reviewed entity`;
    if (problem) {
      rejected.push({ item, reason: problem });
      continue;
    }
    if (isPersonEdited(kiOf(id))) {
      rejected.push({ item, reason: 'a person edited it' });
      continue;
    }
    claimed.add(id);
    groups.push({
      item,
      writes: [{ id, build: rewrite({ description, content }, []) }],
      moves: [],
      tombstones: [],
      changes: [{ id, change: 'summarized', reason }],
    });
  }

  const listed = new Map(batch.relationships.map((link) => [link.id, link]));
  const removed = new Set<string>();
  const pairOf = ({ from, to }: { from: string; to: string }) => [from, to].sort().join('|');
  for (const { id, reason } of changeSet.relationships) {
    const item = `relationship ${id}`;
    const link = listed.get(id);
    const stored = kis.get(id);
    if (!link || !stored || isKiDeleted(stored) || removed.has(id)) {
      rejected.push({ item, reason: `${id} is not a relationship in the batch` });
      continue;
    }
    const twin = batch.relationships.find(
      (other) => other.id !== id && !removed.has(other.id) && pairOf(other) === pairOf(link)
    );
    if (!twin) {
      rejected.push({ item, reason: 'it is neither a duplicate nor the inverse of another' });
      continue;
    }
    removed.add(id);
    groups.push({
      item,
      writes: [],
      moves: [],
      tombstones: [id],
      changes: [{ id, change: 'tombstoned', reason }],
    });
  }

  for (const { group, absorbed } of pendingMoves) {
    group.moves = movesOf(absorbed);
  }

  return { groups, needsReview, rejected };
};
