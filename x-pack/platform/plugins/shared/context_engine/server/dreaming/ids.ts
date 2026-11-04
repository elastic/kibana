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

/**
 * Folds a name to the form that decides an entity's identity: case, accents and punctuation are
 * ignored, so "Acme Corp." and "acme corp" are the same entity.
 */
export const slugify = (name: string): string => {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug.length > 0 ? slug : shortHash(name);
};

/** One entity per type and name, so every run that names it again updates the same KI. */
export const entityId = (type: string, name: string): string =>
  `entity-${slugify(type)}-${slugify(name)}`;

/** Fixed by the run and the model's key, so a retried step writes the same fact again. */
export const factId = (executionId: string, ref: string): string =>
  `fact-${shortHash(executionId, ref)}`;

const KI_URI_PREFIX = 'ki://';

/** Memories are KIs of the same AI index, so dreamed KIs cite them, and each other, by KI id. */
export const kiUri = (kiId: string): string => `${KI_URI_PREFIX}${kiId}`;

export const kiIdFromUri = (uri: string): string | undefined =>
  uri.startsWith(KI_URI_PREFIX) ? uri.slice(KI_URI_PREFIX.length) : undefined;
