/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_KINDS, MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { EntityKind } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { isEntityKind } from './entity_type';
import { readAttribute } from './long_term_types';

/** What a relationship end is: an entity of some kind, a fact or a procedure. */
export type RelationEnd = EntityKind | 'fact' | 'procedure';

interface RelationRule {
  from: readonly RelationEnd[];
  to: readonly RelationEnd[];
}

const ACTORS: readonly RelationEnd[] = ['person', 'team'];
const THINGS: readonly RelationEnd[] = ['system', 'service', 'project', 'data', 'other'];
const ENTITIES: readonly RelationEnd[] = [...ACTORS, ...THINGS];
const ANY: readonly RelationEnd[] = [...ENTITIES, 'fact', 'procedure'];

/** The fallback relation, for links no other relation describes. It needs a description. */
export const RELATED_TO = 'related_to';

/** The relations dreaming records, and which ends each one may join. */
export const RELATION_RULES: Readonly<Record<string, RelationRule>> = {
  member_of: { from: ACTORS, to: ['team'] },
  leads: { from: ['person'], to: ['team', 'project'] },
  owns: { from: ACTORS, to: THINGS },
  maintains: { from: ACTORS, to: THINGS },
  works_on: { from: ACTORS, to: THINGS },
  uses: { from: ENTITIES, to: THINGS },
  depends_on: { from: THINGS, to: THINGS },
  part_of: { from: THINGS, to: THINGS },
  applies_to: { from: ['procedure'], to: ENTITIES },
  about: { from: ['fact'], to: [...ENTITIES, 'procedure'] },
  [RELATED_TO]: { from: ANY, to: ANY },
};

export const RELATIONS: readonly string[] = Object.keys(RELATION_RULES);

export const getRelationEnd = (memory: StoredMemoryDocument): RelationEnd | undefined => {
  switch (memory.type) {
    case 'memory.fact':
      return 'fact';
    case 'memory.procedure':
      return 'procedure';
    case 'memory.entity': {
      const kind = readAttribute(memory, MEMORY_ATTRIBUTES.entityKind);
      return isEntityKind(kind) ? kind : 'other';
    }
    default:
      return undefined;
  }
};

/** Why the relation cannot join the two memories; undefined when it can. */
export const checkRelation = ({
  from,
  relation,
  to,
  description,
}: {
  from: StoredMemoryDocument;
  relation: string;
  to: StoredMemoryDocument;
  description: string;
}): string | undefined => {
  const rule = RELATIONS.includes(relation) ? RELATION_RULES[relation] : undefined;
  if (!rule) {
    return `'${relation}' is not an allowed relation`;
  }
  const fromEnd = getRelationEnd(from);
  const toEnd = getRelationEnd(to);
  if (!fromEnd || !toEnd) {
    return 'an end is not an entity, fact or procedure';
  }
  if (!rule.from.includes(fromEnd) || !rule.to.includes(toEnd)) {
    return `'${relation}' cannot link a ${fromEnd} to a ${toEnd}`;
  }
  if (relation === RELATED_TO && description.trim().length === 0) {
    return `'${RELATED_TO}' needs a description of how the two relate`;
  }
  return undefined;
};

const formatEnds = (ends: readonly RelationEnd[]): string => {
  const kinds = ends.filter((end) => end !== 'fact' && end !== 'procedure');
  const entities =
    kinds.length === ENTITY_KINDS.length
      ? ['any entity']
      : kinds.length > 0
      ? [`${kinds.join('/')} entity`]
      : [];
  return [...entities, ...ends.filter((end) => end === 'fact' || end === 'procedure')].join(', ');
};

/** One prompt line per relation: `- owns: person/team entity -> system/... entity`. */
export const describeRelationRules = (): string[] =>
  Object.entries(RELATION_RULES).map(
    ([relation, rule]) => `- ${relation}: ${formatEnds(rule.from)} -> ${formatEnds(rule.to)}`
  );
