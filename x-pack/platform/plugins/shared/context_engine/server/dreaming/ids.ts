/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

const MAX_SLUG_LENGTH = 96;
const HASH_LENGTH = 16;

export const shortHash = (...parts: string[]): string =>
  createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, HASH_LENGTH);

const identityOf = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean)
    .join(' ');

/** A readable id segment for a name, hash-suffixed when it cannot carry the whole name. */
export const slugify = (name: string): string => {
  const identity = identityOf(name);
  const readable = identity.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const slug = readable.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
  if (slug.length === 0) {
    return shortHash(identity.length > 0 ? identity : name);
  }
  const lossless = readable.length <= MAX_SLUG_LENGTH && readable.replace(/-/g, ' ') === identity;
  return lossless ? slug : `${slug}-${shortHash(identity)}`;
};

/** The KI id of an entity, from its type, name and audience. */
export const entityId = (type: string, name: string, audience?: string): string =>
  `entity-${slugify(type)}--${slugify(name)}${audience ? `--${audience}` : ''}`;

/** The KI id of a new fact, from the run, the batch of memories and the model's key. */
export const factId = (executionId: string, batchKey: string, ref: string): string =>
  `fact-${shortHash(executionId, batchKey, ref)}`;

/** A relationship's `memory.key`: `<from id>|<relationship type>|<to id>`. */
export const relationshipKey = (from: string, relation: string, to: string): string =>
  `${from}|${relation}|${to}`;

/** The KI id of a relationship, derived from its key. */
export const relationshipId = (key: string): string => `relationship-${shortHash(key)}`;

/** The key of a batch of memories. */
export const batchKeyOf = (memoryIds: Iterable<string>): string =>
  shortHash(...[...memoryIds].sort());

const KI_URI_PREFIX = 'ki://';

/** The URI of a KI in the same AI index. */
export const kiUri = (kiId: string): string => `${KI_URI_PREFIX}${kiId}`;

export const kiIdFromUri = (uri: string): string | undefined =>
  uri.startsWith(KI_URI_PREFIX) ? uri.slice(KI_URI_PREFIX.length) : undefined;

/** Memory ids of session memories: the prefix, then the id the memory was saved under. */
export const SESSION_MEMORY_ID_PREFIX = 'session-memory:';
/** Memory ids of session turns: the prefix, then the session id, a slash and the turn id. */
export const SESSION_TURN_ID_PREFIX = 'session:';

/** The memories dreaming reads from outside the AI index, each cited by a URI scheme of its own. */
const EXTERNAL_MEMORY_SOURCES = [
  { idPrefix: SESSION_MEMORY_ID_PREFIX, uriPrefix: 'session-memory://' },
  { idPrefix: SESSION_TURN_ID_PREFIX, uriPrefix: 'session://' },
] as const;

/** The id prefixes of the memories dreaming reads from outside the AI index. */
export const EXTERNAL_MEMORY_ID_PREFIXES: readonly string[] = EXTERNAL_MEMORY_SOURCES.map(
  ({ idPrefix }) => idPrefix
);

/** Whether a memory id names a memory KI of the AI index, not one read from outside it. */
export const isMemoryKiId = (memoryId: string): boolean =>
  !EXTERNAL_MEMORY_SOURCES.some(({ idPrefix }) => memoryId.startsWith(idPrefix));

/** The URI a dreamed KI cites a memory by: its source's scheme, or `ki://` for a memory KI. */
export const memoryUri = (memoryId: string): string => {
  const source = EXTERNAL_MEMORY_SOURCES.find(({ idPrefix }) => memoryId.startsWith(idPrefix));
  return source ? `${source.uriPrefix}${memoryId.slice(source.idPrefix.length)}` : kiUri(memoryId);
};

/** The memory id a `derived_from` reference cites, the reverse of {@link memoryUri}. */
export const memoryIdFromUri = (uri: string): string | undefined => {
  const source = EXTERNAL_MEMORY_SOURCES.find(({ uriPrefix }) => uri.startsWith(uriPrefix));
  return source ? `${source.idPrefix}${uri.slice(source.uriPrefix.length)}` : kiIdFromUri(uri);
};
