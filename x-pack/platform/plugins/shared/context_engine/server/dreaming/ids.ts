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

/** The letters and digits of a name, case- and accent-folded, which decide an entity's identity. */
const identityOf = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(' ');

/**
 * Folds a name to a readable id segment: case, accents and punctuation are ignored, so
 * "Acme Corp." and "acme corp" are the same entity. When the segment can't carry the whole
 * identity, because it drops letters outside a-z or is cut short, a hash of the identity keeps
 * names such as "Customer 张三" and "Customer 李四" apart.
 */
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

/** One entity per type and name, so every run that names it again updates the same KI. */
export const entityId = (type: string, name: string): string =>
  `entity-${slugify(type)}-${slugify(name)}`;

/**
 * Fixed by the run, the batch of memories the model was shown and the model's key: every prompt
 * numbers its new facts from `new:1`, and a retried step writes the same fact again.
 */
export const factId = (executionId: string, batchKey: string, ref: string): string =>
  `fact-${shortHash(executionId, batchKey, ref)}`;

/** Identifies the batch of memories one prompt was shown. */
export const batchKeyOf = (memoryIds: Iterable<string>): string =>
  shortHash(...[...memoryIds].sort());

const KI_URI_PREFIX = 'ki://';

/** Memories are KIs of the same AI index, so dreamed KIs cite them, and each other, by KI id. */
export const kiUri = (kiId: string): string => `${KI_URI_PREFIX}${kiId}`;

export const kiIdFromUri = (uri: string): string | undefined =>
  uri.startsWith(KI_URI_PREFIX) ? uri.slice(KI_URI_PREFIX.length) : undefined;
