/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_KINDS, MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { EntityKind } from '../../../common/memory';
import { updateMemoryProvenance } from '../memory_document';
import type { LongTermMemoryTypeDefinition } from './long_term_types';
import {
  ENTITY_DREAM_OPERATIONS,
  SHARED_DREAM_OPERATIONS,
  readAttribute,
  readListAttribute,
} from './long_term_types';

export const MAX_ENTITY_ALIASES = 20;
const MAX_ALIAS_LENGTH = 200;
const MAX_SLUG_LENGTH = 100;

export const isEntityKind = (value: string | undefined): value is EntityKind =>
  ENTITY_KINDS.some((kind) => kind === value);

export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH);

/** The key of an entity: its kind and name, so the same entity always lands on one memory. */
export const buildEntityKey = (kind: EntityKind, name: string): string =>
  `${kind}:${slugify(name)}`;

/** Trims and dedupes aliases, dropping the entity's own name. */
export const mergeAliases = (name: string, ...lists: string[][]): string[] => {
  const seen = new Set([name.trim().toLowerCase()]);
  const aliases: string[] = [];
  for (const alias of lists.flat()) {
    const trimmed = alias.trim().slice(0, MAX_ALIAS_LENGTH);
    const normalized = trimmed.toLowerCase();
    if (trimmed.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      aliases.push(trimmed);
    }
  }
  return aliases.slice(0, MAX_ENTITY_ALIASES);
};

export const ENTITY_MEMORY_TYPE: LongTermMemoryTypeDefinition = {
  type: 'memory.entity',
  label: 'entities',
  instructions: [
    'An entity is a specific, named thing that sessions refer to: a person, team, system, service, project, or data set such as an index.',
    'Only record named, specific things. A generic word such as "the database" or "the dashboard" is not an entity.',
    'Set `title` to the canonical name, `kind` to what the entity is, `description` to one line saying what it is, and `content` to what sessions said about it that stays true, such as its purpose, owner, or where it lives.',
    'For a person, only record work context: their name, role, team, and what they own or work on. Never record contact details, personal details, or opinions about a person.',
    'Links between entities, facts and procedures are recorded separately; do not list them as entities.',
    'Use `create` for a new entity. The key is built from `kind` and `title`, so do not set `key`.',
    'Use `reinforce` when a session refers to an existing entity without adding anything new.',
    'Use `add_aliases` when a session uses another name for an existing entity; put the new names in `aliases`.',
    'Use `supersede` when what is known about an existing entity has changed or grown; give the full new entity.',
    'Use `outdate` when an entity no longer exists, for example a decommissioned system or a team that was dissolved.',
  ].join('\n'),
  operations: [...SHARED_DREAM_OPERATIONS, ...ENTITY_DREAM_OPERATIONS],
  outputProperties: {
    kind: { type: 'string', enum: [...ENTITY_KINDS], description: 'What the entity is.' },
    aliases: {
      type: 'array',
      items: { type: 'string' },
      description: 'Other names the entity goes by.',
    },
  },
  initialAttributes: () => ({}),
  prepare: (operation, { target }) => {
    const kind = operation.kind ?? readAttribute(target, MEMORY_ATTRIBUTES.entityKind);
    if (!isEntityKind(kind)) {
      return { ok: false, reason: `it has no valid kind (${ENTITY_KINDS.join(', ')})` };
    }
    const { title, description, content } = operation;
    if (!(title && description && content)) {
      return { ok: false, reason: 'it is missing title, description or content' };
    }
    if (slugify(title).length === 0) {
      return { ok: false, reason: 'its title has no letters or digits' };
    }
    const aliases = mergeAliases(
      title,
      readListAttribute(target, MEMORY_ATTRIBUTES.entityAliases),
      target ? [target.title] : [],
      operation.aliases ?? []
    );
    return {
      ok: true,
      memory: {
        key: buildEntityKey(kind, title),
        title,
        description,
        content,
        attributes: {
          [MEMORY_ATTRIBUTES.entityKind]: kind,
          ...(aliases.length > 0 && { [MEMORY_ATTRIBUTES.entityAliases]: aliases }),
        },
      },
    };
  },
  describe: (memory) => {
    const aliases = readListAttribute(memory, MEMORY_ATTRIBUTES.entityAliases);
    return [
      `kind: ${readAttribute(memory, MEMORY_ATTRIBUTES.entityKind) ?? 'other'}`,
      ...(aliases.length > 0 ? [`aliases: ${aliases.join(', ')}`] : []),
    ];
  },
  applyOperation: (operation, existing, { now, writer }) => {
    if (operation.op !== 'add_aliases') {
      return undefined;
    }
    const current = readListAttribute(existing, MEMORY_ATTRIBUTES.entityAliases);
    const aliases = mergeAliases(existing.title, current, operation.aliases ?? []);
    if (aliases.length === current.length) {
      return { kind: 'skip', reason: 'it adds no new alias' };
    }
    return {
      kind: 'update',
      document: {
        ...existing,
        updated_at: now,
        attributes: { ...existing.attributes, [MEMORY_ATTRIBUTES.entityAliases]: aliases },
        governance: updateMemoryProvenance(existing.governance, writer, false),
      },
    };
  },
};
