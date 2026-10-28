/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_KINDS } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import type { LongTermMemoryTypeDefinition } from './long_term_types';
import { RELATIONS } from './relation_rules';

const MAX_OPTION_CHARS = 300;

/** The end types a proposed link may name, without the `memory.` prefix. */
export const LINK_END_TYPES = ['entity', 'fact', 'procedure'] as const;

const truncate = (value: string | undefined, max = MAX_OPTION_CHARS) =>
  value === undefined ? '' : value.length > max ? `${value.slice(0, max)}…` : value;

const linkEndProperties = (end: 'from' | 'to') =>
  ({
    [`${end}_id`]: {
      type: 'string',
      description: `The id of the "${end}" memory, when it is listed under "Existing long-term memories".`,
    },
    [`${end}_title`]: {
      type: 'string',
      description: `The title the "${end}" memory has or would have. Use when it is not listed.`,
    },
    [`${end}_type`]: { type: 'string', description: `One of: ${LINK_END_TYPES.join(', ')}.` },
    [`${end}_kind`]: {
      type: 'string',
      description: `For an entity, its kind. One of: ${ENTITY_KINDS.join(', ')}.`,
    },
  } as const);

const sourceIdsSchema = {
  type: 'array',
  items: { type: 'string' },
  description: 'The short-term memory ids that support this.',
} as const;

export const LINK_FIND_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ...linkEndProperties('from'),
          relation: { type: 'string', description: `One of: ${RELATIONS.join(', ')}.` },
          ...linkEndProperties('to'),
          description: { type: 'string', description: 'One sentence on why the link holds.' },
          source_ids: sourceIdsSchema,
        },
        required: ['relation'],
      },
    },
    outdate: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target_id: {
            type: 'string',
            description: 'The existing relationship that no longer holds.',
          },
          source_ids: sourceIdsSchema,
          reason: { type: 'string' },
        },
        required: ['target_id'],
      },
    },
  },
  required: ['links'],
} as const;

export const buildLinkFindSystemPrompt = (definition: LongTermMemoryTypeDefinition): string =>
  [
    'You maintain the long-term memory of a team of AI agents and their users.',
    `Read the short-term memories recorded during recent sessions and list the ${definition.label} between long-term memories that they show.`,
    '',
    definition.instructions,
    '',
    'Rules:',
    '- `source_ids` must be short-term memory ids; every link needs at least one.',
    '- Never link a memory to itself.',
    '- Return no links when the sessions show none. Do not invent information.',
  ].join('\n');

export interface MatchQuestion {
  ref: string;
  name: string;
  type?: string;
  kind?: string;
  /** The proposed links that use the name, as sentences. */
  usedIn: string[];
  options: StoredMemoryDocument[];
}

export const LINK_MATCH_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          id: {
            type: 'string',
            description: 'The id of the option the name refers to. Omit when none does.',
          },
        },
        required: ['ref'],
      },
    },
  },
  required: ['matches'],
} as const;

export const LINK_MATCH_SYSTEM_PROMPT = [
  'You resolve names used in proposed links to the long-term memories they refer to.',
  'For each name, pick the option that is the same thing: the same person, team, system, fact or procedure, not merely a related one.',
  'Omit `id` when no option is clearly the same thing. Only use ids listed for that name.',
].join('\n');

const formatOption = (memory: StoredMemoryDocument) =>
  [
    `  - id: ${memory.id}`,
    `    type: ${memory.type}`,
    `    title: ${memory.title}`,
    `    description: ${truncate(memory.description)}`,
  ].join('\n');

export const buildLinkMatchInput = (questions: MatchQuestion[]): string =>
  questions
    .map(({ ref, name, type, kind, usedIn, options }) =>
      [
        `## ${ref}`,
        `name: ${name}`,
        ...(type ? [`type: ${type}${kind ? ` (${kind})` : ''}`] : []),
        'used in:',
        ...usedIn.map((sentence) => `  - ${sentence}`),
        'options:',
        ...options.map(formatOption),
      ].join('\n')
    )
    .join('\n\n');

export const LINK_CHECK_OPERATIONS = ['create', 'reinforce', 'supersede', 'skip'] as const;
export type LinkCheckOperation = (typeof LINK_CHECK_OPERATIONS)[number];

export interface CheckQuestion {
  ref: string;
  sentence: string;
  description: string;
  related: StoredMemoryDocument[];
}

export const LINK_CHECK_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          op: { type: 'string', description: `One of: ${LINK_CHECK_OPERATIONS.join(', ')}.` },
          target_id: {
            type: 'string',
            description: 'For reinforce and supersede: the existing link it acts on.',
          },
          reason: { type: 'string', description: 'One sentence explaining the decision.' },
        },
        required: ['ref', 'op'],
      },
    },
  },
  required: ['decisions'],
} as const;

export const LINK_CHECK_SYSTEM_PROMPT = [
  'You check proposed links between long-term memories against the existing links they may repeat or contradict.',
  'For each proposed link, decide:',
  '- `reinforce` when an existing link already says the same thing, even in other words. Set `target_id` to it.',
  '- `supersede` when the proposed link replaces an existing link that no longer holds, for example ownership that moved to another team. Set `target_id` to the replaced link.',
  '- `create` when the proposed link is new and the existing links still hold alongside it.',
  '- `skip` when the proposed link is wrong given the existing links.',
  'Only use target ids listed for that proposed link. Newer sessions win over older links.',
].join('\n');

const formatRelated = (link: StoredMemoryDocument) =>
  [
    `  - id: ${link.id}`,
    `    link: ${link.title}`,
    `    description: ${truncate(link.description)}`,
    `    updated_at: ${link.updated_at}`,
  ].join('\n');

export const buildLinkCheckInput = (questions: CheckQuestion[]): string =>
  questions
    .map(({ ref, sentence, description, related }) =>
      [
        `## ${ref}`,
        `proposed: ${sentence}`,
        `description: ${description}`,
        'existing links:',
        ...related.map(formatRelated),
      ].join('\n')
    )
    .join('\n\n');
