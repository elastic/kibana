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

/** The KI id of an entity, from its type, name and audience; a slug never holds `--`, so they cannot run together. */
export const entityId = (type: string, name: string, audience?: string): string =>
  `entity-${slugify(type)}--${slugify(name)}${audience ? `--${audience}` : ''}`;

/** The KI id of a new fact, from the run, the batch of memories and the model's key. */
export const factId = (executionId: string, batchKey: string, ref: string): string =>
  `fact-${shortHash(executionId, batchKey, ref)}`;

/** The key of a batch of memories. */
export const batchKeyOf = (memoryIds: Iterable<string>): string =>
  shortHash(...[...memoryIds].sort());

const KI_URI_PREFIX = 'ki://';

/** The URI of a KI in the same AI index. */
export const kiUri = (kiId: string): string => `${KI_URI_PREFIX}${kiId}`;

export const kiIdFromUri = (uri: string): string | undefined =>
  uri.startsWith(KI_URI_PREFIX) ? uri.slice(KI_URI_PREFIX.length) : undefined;
