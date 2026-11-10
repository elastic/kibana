/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ABOUT_RELATIONSHIP_TYPE,
  dreamingTypesOf,
  type AiIndexDreamingConfig,
} from '../../common/dreaming';
import type { DreamRelationshipChangeSet } from '../../common/step_types/apply_dream_relationships';
import { citedMemoryIds, kindOf, type DreamedKi } from './dreamed_ki';
import { relationshipId, relationshipKey } from './ids';
import { samePermissions, type KiPermissions } from './permissions';
import type { DeleteOperation, ResolvedChangeSet } from './resolve_change_set';

export interface UpsertRelationshipOperation {
  op: 'upsert_relationship';
  id: string;
  /** `<from id>|<relationship type>|<to id>`. */
  key: string;
  relation: string;
  from: Pick<DreamedKi, 'id' | 'title'>;
  to: Pick<DreamedKi, 'id' | 'title'>;
  description?: string;
  sourceMemoryIds: string[];
}

export type RelationshipOperation = UpsertRelationshipOperation | DeleteOperation;

export interface ResolvedRelationships {
  operations: RelationshipOperation[];
  rejected: ResolvedChangeSet['rejected'];
}

export interface ResolveRelationshipsContext {
  relationshipTypes: ReadonlySet<string>;
  /** The permissions of each memory of the batch, by id. */
  memoryPermissions: ReadonlyMap<string, KiPermissions | undefined>;
  /** The facts and entities the relationships may link, by id. */
  ends: ReadonlyMap<string, DreamedKi>;
  /** The current relationships the change set refers to, by id. */
  existing: ReadonlyMap<string, DreamedKi>;
}

export const relationshipTypesOf = (config: AiIndexDreamingConfig): ReadonlySet<string> =>
  new Set(dreamingTypesOf(config).relationships.map(({ type }) => type));

const idOf = ({ from, relation, to }: DreamRelationshipChangeSet['relationships'][number]) =>
  relationshipId(relationshipKey(from, relation, to));

/** The ids of the facts and entities a change set links, and of the relationships it names. */
export const relationshipRefsOf = ({
  relationships,
}: DreamRelationshipChangeSet): { ends: string[]; relationships: string[] } => ({
  ends: [...new Set(relationships.flatMap(({ from, to }) => [from, to]))],
  relationships: [...new Set(relationships.map(idOf))],
});

class RejectedRelationshipError extends Error {}

const reject: (reason: string) => never = (reason) => {
  throw new RejectedRelationshipError(reason);
};

/**
 * Validates relationship changes and resolves them to KI ids. A relationship is based on the batch
 * memories both its ends cite, or else on those either end cites.
 */
export const resolveRelationships = (
  { relationships }: DreamRelationshipChangeSet,
  { relationshipTypes, memoryPermissions, ends, existing }: ResolveRelationshipsContext
): ResolvedRelationships => {
  const operations: RelationshipOperation[] = [];
  const rejected: ResolvedRelationships['rejected'] = [];
  const listed = new Set<string>();

  const endOf = (ref: string): DreamedKi => {
    const end = ends.get(ref);
    if (!end) {
      reject(`'${ref}' is not an existing fact or entity`);
    }
    return end;
  };

  const batchMemoriesCitedBy = (end: DreamedKi): Set<string> =>
    new Set(citedMemoryIds(end).filter((id) => memoryPermissions.has(id)));

  const sourcesOf = (from: DreamedKi, to: DreamedKi): string[] => {
    const fromCited = batchMemoriesCitedBy(from);
    const toCited = batchMemoriesCitedBy(to);
    const both = [...fromCited].filter((id) => toCited.has(id));
    return both.length > 0 ? both : [...new Set([...fromCited, ...toCited])];
  };

  for (const relationship of relationships) {
    const { from: fromRef, to: toRef, relation } = relationship;
    const item = `relationship ${fromRef} ${relation} ${toRef}`;
    try {
      if (relationshipTypes.size === 0) {
        reject('this AI index does not build relationships');
      }
      const isAbout = relation === ABOUT_RELATIONSHIP_TYPE;
      if (!isAbout && !relationshipTypes.has(relation)) {
        reject(`relationship type '${relation}' is not configured`);
      }
      if (fromRef === toRef) {
        reject('links an item to itself');
      }
      const from = endOf(fromRef);
      const to = endOf(toRef);
      if (isAbout && (kindOf(from) !== 'fact' || kindOf(to) !== 'entity')) {
        reject(`'${ABOUT_RELATIONSHIP_TYPE}' links a fact to an entity`);
      }
      if (!isAbout && (kindOf(from) !== 'entity' || kindOf(to) !== 'entity')) {
        reject(`'${relation}' links two entities; a fact links with '${ABOUT_RELATIONSHIP_TYPE}'`);
      }
      const id = idOf(relationship);
      if (listed.has(id)) {
        reject('is listed twice');
      }
      const current = existing.get(id);
      if (relationship.delete) {
        if (!current) {
          reject('only an existing relationship can be deleted');
        }
        listed.add(id);
        operations.push({ op: 'delete', id });
        continue;
      }
      const description = relationship.description ?? current?.description;
      if (!description) {
        reject('a new relationship needs a description');
      }
      const sourceMemoryIds = sourcesOf(from, to);
      if (sourceMemoryIds.length === 0) {
        reject('neither end is based on these memories');
      }
      for (const end of [from, to]) {
        if (
          !sourceMemoryIds.every((memoryId) =>
            samePermissions(memoryPermissions.get(memoryId), end.permissions)
          )
        ) {
          reject(`'${end.id}' has different permissions than the memories behind it`);
        }
      }
      listed.add(id);
      operations.push({
        op: 'upsert_relationship',
        id,
        key: relationshipKey(fromRef, relation, toRef),
        relation,
        from: { id: from.id, title: from.title },
        to: { id: to.id, title: to.title },
        description,
        sourceMemoryIds,
      });
    } catch (error) {
      if (!(error instanceof RejectedRelationshipError)) {
        throw error;
      }
      rejected.push({ item, reason: error.message });
    }
  }

  return { operations, rejected };
};
