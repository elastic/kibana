/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * `_meta` field where the content hash of a managed alerts-as-data resource is
 * stamped, so a later install can detect that nothing changed and skip the write.
 */
export const RESOURCE_CONTENT_HASH_META_FIELD = 'content_hash';

/**
 * Deterministic JSON serialization: object keys are sorted recursively and
 * `undefined`-valued keys are dropped (mirroring `JSON.stringify`), so two
 * structurally-equal bodies always produce the same string regardless of the
 * order their keys happened to be built in. Array order is preserved because it
 * is significant (e.g. `composed_of`, `dynamic_templates`).
 */
const stableStringify = (value: unknown): string => {
  if (value === undefined) {
    return 'null';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
};

/**
 * Computes a stable content hash of a resource body. Used to stamp managed
 * resources and to compare an already-installed resource against the one we are
 * about to install, so unchanged resources can skip the (cluster-state) write.
 */
export const computeResourceHash = (body: unknown): string =>
  createHash('sha256').update(stableStringify(body)).digest('hex').slice(0, 16);
