/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import type { LongTermMemoryTypeDefinition } from './long_term_types';
import { getLongTermMemoryTypeDefinition } from './memory_types';

const MAX_CONTENT_CHARS = 2000;

const truncate = (value: string | undefined, max = MAX_CONTENT_CHARS) =>
  value === undefined ? '' : value.length > max ? `${value.slice(0, max)}…` : value;

export const buildDreamSystemPrompt = (definition: LongTermMemoryTypeDefinition): string =>
  [
    'You maintain the long-term memory of a team of AI agents and their users.',
    `Read the short-term memories recorded during recent sessions, compare them with the existing long-term ${definition.label}, and decide which changes to make to the long-term ${definition.label}.`,
    '',
    definition.instructions,
    '',
    'Rules:',
    `- Only use ids that appear in the input. \`target_id\` must be the id of an existing long-term memory of this type; \`source_ids\` must be short-term memory ids.`,
    '- Every operation needs at least one source id.',
    '- `create` and `supersede` need every field the instructions above ask for; operations missing them are skipped.',
    '- Prefer `reinforce` over `create` when an existing memory already says the same thing.',
    '- Return no operations when nothing should change. Do not invent information.',
  ].join('\n');

export const formatShortTerm = (memory: StoredMemoryDocument) =>
  [
    `- id: ${memory.id}`,
    `  type: ${memory.type}`,
    `  recorded_at: ${memory['@timestamp']}`,
    `  title: ${memory.title}`,
    `  description: ${truncate(memory.description)}`,
    `  content: ${truncate(memory.content)}`,
  ].join('\n');

export const formatLongTerm = (memory: StoredMemoryDocument) =>
  [
    `- id: ${memory.id}`,
    `  type: ${memory.type}`,
    `  key: ${memory.attributes?.[MEMORY_ATTRIBUTES.key] ?? ''}`,
    `  title: ${memory.title}`,
    `  description: ${truncate(memory.description)}`,
    `  content: ${truncate(memory.content)}`,
    ...(getLongTermMemoryTypeDefinition(memory.type)?.describe?.(memory) ?? []).map(
      (line) => `  ${line}`
    ),
  ].join('\n');

const formatList = (memories: StoredMemoryDocument[]) =>
  memories.length > 0 ? memories.map(formatLongTerm).join('\n') : '(none)';

export const buildDreamInput = ({
  sessions,
  candidates,
  links,
  definition,
}: {
  sessions: Map<string, StoredMemoryDocument[]>;
  candidates: StoredMemoryDocument[];
  /** Existing memories of a linking type, between the candidates. */
  links?: StoredMemoryDocument[];
  definition: LongTermMemoryTypeDefinition;
}): string =>
  [
    '# Short-term memories, by session',
    ...[...sessions].map(([sessionId, memories]) =>
      [`## Session ${sessionId}`, ...memories.map(formatShortTerm)].join('\n')
    ),
    '',
    ...(definition.endpointTypes
      ? [
          '# Existing long-term memories',
          formatList(candidates),
          '',
          `# Existing long-term ${definition.label}`,
          formatList(links ?? []),
        ]
      : [`# Existing long-term ${definition.label}`, formatList(candidates)]),
  ].join('\n');

export const buildDreamOutputSchema = (definition: LongTermMemoryTypeDefinition) =>
  ({
    type: 'object',
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: [...definition.operations] },
            target_id: {
              type: 'string',
              description: 'The existing long-term memory to change. Omit for create.',
            },
            key: { type: 'string', description: 'What the memory is about.' },
            title: { type: 'string' },
            description: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            ...definition.outputProperties,
            source_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'The short-term memory ids that support this operation.',
            },
            reason: { type: 'string', description: 'One sentence explaining the operation.' },
          },
          required: ['op', 'source_ids'],
        },
      },
    },
    required: ['operations'],
  } as const);
