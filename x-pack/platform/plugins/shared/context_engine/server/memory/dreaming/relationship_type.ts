/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LONG_TERM_MEMORY_AI_INDEX_ID, MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { LongTermMemoryType } from '../../../common/memory';
import type { MemoryReference, StoredMemoryDocument } from '../memory_document';
import { buildKiUri } from '../memory_document';
import type { LongTermMemoryTypeDefinition, PreparedMemory } from './long_term_types';
import { SHARED_DREAM_OPERATIONS, readAttribute } from './long_term_types';

export const RELATIONSHIP_ENDPOINT_TYPES: readonly LongTermMemoryType[] = [
  'memory.entity',
  'memory.fact',
  'memory.procedure',
];

const RELATION_PATTERN = /^[a-z][a-z_]{1,39}$/;

/** The `description` of the two references that point at a relationship's ends. */
export const RELATIONSHIP_END_ROLES = { from: 'from', to: 'to' } as const;

export const isRelationshipEnd = (memory: StoredMemoryDocument): boolean =>
  RELATIONSHIP_ENDPOINT_TYPES.some((type) => type === memory.type);

export const normalizeRelation = (relation: string): string =>
  relation
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const endReference = (id: string, role: string): MemoryReference => ({
  uri: buildKiUri(LONG_TERM_MEMORY_AI_INDEX_ID, id),
  relation: 'relates_to',
  description: role,
});

export const isEndReference = ({ relation, description }: MemoryReference): boolean =>
  relation === 'relates_to' &&
  (description === RELATIONSHIP_END_ROLES.from || description === RELATIONSHIP_END_ROLES.to);

const buildContent = (title: string, description: string) =>
  description.length > 0 ? `${title}.\n${description}` : title;

/** Everything about a relationship that follows from its two ends and the relation. */
export const buildRelationshipFields = ({
  from,
  relation,
  to,
  description,
}: {
  from: StoredMemoryDocument;
  relation: string;
  to: StoredMemoryDocument;
  description: string;
}): PreparedMemory => {
  const title = `${from.title} ${relation.replace(/_/g, ' ')} ${to.title}`;
  return {
    key: `${from.id}|${relation}|${to.id}`,
    title,
    description,
    content: buildContent(title, description),
    attributes: {
      [MEMORY_ATTRIBUTES.relationshipFromId]: from.id,
      [MEMORY_ATTRIBUTES.relationshipToId]: to.id,
      [MEMORY_ATTRIBUTES.relationshipRelation]: relation,
    },
    references: [
      endReference(from.id, RELATIONSHIP_END_ROLES.from),
      endReference(to.id, RELATIONSHIP_END_ROLES.to),
    ],
  };
};

export const RELATIONSHIP_MEMORY_TYPE: LongTermMemoryTypeDefinition = {
  type: 'memory.relationship',
  label: 'relationships',
  instructions: [
    'A relationship links two existing long-term memories: an entity, a fact or a procedure. For example a team owns a system, a service depends on another, a fact is about an entity, or a procedure applies to a system.',
    'Only link memories listed under "Existing long-term memories", by id. Never link a memory to itself.',
    'Only record links a session stated or clearly showed, and that stay true. Do not infer links from two memories merely being mentioned together.',
    'Set `from_id`, `relation` and `to_id` so that "<from> <relation> <to>" reads as a true sentence. `relation` is a short lowercase verb in snake_case, for example `owns`, `member_of`, `part_of`, `depends_on`, `uses`, `maintains`, `about` or `applies_to`.',
    'Set `description` to one sentence on why the link holds. The title and key are built from the two ends, so do not set them.',
    'Use `create` for a new link.',
    'Use `reinforce` when a session repeats an existing link.',
    'Use `supersede` when an existing link changed, for example the relation or one of its ends; give the full new link.',
    'Use `outdate` when a link no longer holds and nothing replaces it, for example ownership moved to a team that is not a known entity.',
  ].join('\n'),
  operations: SHARED_DREAM_OPERATIONS,
  endpointTypes: RELATIONSHIP_ENDPOINT_TYPES,
  outputProperties: {
    from_id: { type: 'string', description: 'The memory the relationship starts from.' },
    relation: { type: 'string', description: 'A short lowercase verb in snake_case.' },
    to_id: { type: 'string', description: 'The memory the relationship points at.' },
  },
  initialAttributes: () => ({}),
  prepare: async (operation, { target, getLiveMemory }) => {
    const fromId = operation.from_id ?? readAttribute(target, MEMORY_ATTRIBUTES.relationshipFromId);
    const toId = operation.to_id ?? readAttribute(target, MEMORY_ATTRIBUTES.relationshipToId);
    const rawRelation =
      operation.relation ?? readAttribute(target, MEMORY_ATTRIBUTES.relationshipRelation);
    if (!fromId || !toId || !rawRelation) {
      return { ok: false, reason: 'it is missing from_id, relation or to_id' };
    }
    const relation = normalizeRelation(rawRelation);
    if (!RELATION_PATTERN.test(relation)) {
      return { ok: false, reason: `the relation '${rawRelation}' is not a short lowercase verb` };
    }
    if (fromId === toId) {
      return { ok: false, reason: 'it links a memory to itself' };
    }
    const [from, to] = await Promise.all([getLiveMemory(fromId), getLiveMemory(toId)]);
    if (!from || !to || !isRelationshipEnd(from) || !isRelationshipEnd(to)) {
      return {
        ok: false,
        reason: 'an end is not a live entity, fact or procedure in this space',
      };
    }
    return {
      ok: true,
      memory: buildRelationshipFields({
        from,
        relation,
        to,
        description: operation.description ?? target?.description ?? '',
      }),
    };
  },
  describe: (memory) => [
    `from_id: ${readAttribute(memory, MEMORY_ATTRIBUTES.relationshipFromId) ?? ''}`,
    `relation: ${readAttribute(memory, MEMORY_ATTRIBUTES.relationshipRelation) ?? ''}`,
    `to_id: ${readAttribute(memory, MEMORY_ATTRIBUTES.relationshipToId) ?? ''}`,
  ],
};
