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
import { RELATED_TO, checkRelation, describeRelationRules } from './relation_rules';

export const RELATIONSHIP_ENDPOINT_TYPES: readonly LongTermMemoryType[] = [
  'memory.entity',
  'memory.fact',
  'memory.procedure',
];

/** The `description` of the two references that point at a relationship's ends. */
export const RELATIONSHIP_END_ROLES = { from: 'from', to: 'to' } as const;

export const isRelationshipEnd = (memory: StoredMemoryDocument): boolean =>
  RELATIONSHIP_ENDPOINT_TYPES.some((type) => type === memory.type);

export const normalizeRelation = (relation: string): string =>
  relation
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const END_URI_PREFIX = buildKiUri(LONG_TERM_MEMORY_AI_INDEX_ID, '');

/** The `references.uri` a relationship uses to point at one of its ends. */
export const buildEndUri = (id: string): string => buildKiUri(LONG_TERM_MEMORY_AI_INDEX_ID, id);

const endReference = (id: string, role: string): MemoryReference => ({
  uri: buildEndUri(id),
  relation: 'relates_to',
  description: role,
});

export const isEndReference = ({ relation, description }: MemoryReference): boolean =>
  relation === 'relates_to' &&
  (description === RELATIONSHIP_END_ROLES.from || description === RELATIONSHIP_END_ROLES.to);

/** The ids of the two memories a relationship links, read from its end references. */
export const readRelationshipEnds = (
  link: StoredMemoryDocument | undefined
): { fromId?: string; toId?: string } => {
  const idOf = (role: string) => {
    const reference = link?.references?.find(
      (candidate) =>
        isEndReference(candidate) &&
        candidate.description === role &&
        candidate.uri.startsWith(END_URI_PREFIX)
    );
    return reference ? decodeURIComponent(reference.uri.slice(END_URI_PREFIX.length)) : undefined;
  };
  return { fromId: idOf(RELATIONSHIP_END_ROLES.from), toId: idOf(RELATIONSHIP_END_ROLES.to) };
};

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
    attributes: { [MEMORY_ATTRIBUTES.relationshipRelation]: relation },
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
    'A relationship links two long-term memories: an entity, a fact or a procedure. For example a team owns a system, a service depends on another, a fact is about an entity, or a procedure applies to a system.',
    'Only record links a session stated or clearly showed, and that stay true. Do not infer links from two memories merely being mentioned together.',
    'For each of the two memories, set `from_id` / `to_id` when it is listed under "Existing long-term memories". Otherwise set `from_title` / `to_title` to the title a long-term memory would have, `from_type` / `to_type`, and for an entity `from_kind` / `to_kind`. Links to things that are not long-term memories are dropped.',
    `Set \`relation\` so that "<from> <relation> <to>" reads as a true sentence, using one of the allowed relations below. Use \`${RELATED_TO}\` only when none fits, and then say how the two relate in \`description\`.`,
    'Set `description` to one sentence on why the link holds.',
    'List a link from "Existing long-term relationships" again when a session repeats it. A link that changed, for example ownership that moved to another team, is listed as the new link; the old one is replaced.',
    'Put a link under `outdate`, by id, when a session shows it no longer holds and nothing replaces it.',
    'Allowed relations (from -> to):',
    ...describeRelationRules(),
  ].join('\n'),
  operations: SHARED_DREAM_OPERATIONS,
  endpointTypes: RELATIONSHIP_ENDPOINT_TYPES,
  initialAttributes: () => ({}),
  prepare: async (operation, { target, getLiveMemory }) => {
    const ends = readRelationshipEnds(target);
    const fromId = operation.from_id ?? ends.fromId;
    const toId = operation.to_id ?? ends.toId;
    const rawRelation =
      operation.relation ?? readAttribute(target, MEMORY_ATTRIBUTES.relationshipRelation);
    if (!fromId || !toId || !rawRelation) {
      return { ok: false, reason: 'it is missing from_id, relation or to_id' };
    }
    const relation = normalizeRelation(rawRelation);
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
    const description = operation.description ?? target?.description ?? '';
    const invalid = checkRelation({ from, relation, to, description });
    if (invalid) {
      return { ok: false, reason: invalid };
    }
    return { ok: true, memory: buildRelationshipFields({ from, relation, to, description }) };
  },
  describe: (memory) => {
    const { fromId, toId } = readRelationshipEnds(memory);
    return [
      `from_id: ${fromId ?? ''}`,
      `relation: ${readAttribute(memory, MEMORY_ATTRIBUTES.relationshipRelation) ?? ''}`,
      `to_id: ${toId ?? ''}`,
    ];
  },
};
