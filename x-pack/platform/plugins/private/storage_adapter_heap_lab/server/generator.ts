/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StorageSchema } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';

/**
 * The set of scalar ES field types cycled through when synthesizing mappings.
 * Chosen to mimic the shape of real `@kbn/storage-adapter` consumer schemas
 * (keyword-heavy with some text, numerics, dates and booleans).
 */
const FIELD_TYPE_CYCLE = [
  'keyword',
  'keyword',
  'text',
  'match_only_text',
  'long',
  'double',
  'boolean',
  'date',
] as const;

type SyntheticFieldType = (typeof FIELD_TYPE_CYCLE)[number];

/**
 * Deterministic, seedable PRNG (Park-Miller minimal standard LCG) so experiment
 * runs are reproducible. Uses only multiplication/modulo (no bitwise ops) and
 * stays within safe-integer range (2147483647 * 16807 < 2^53).
 */
export const createRng = (seed: number): (() => number) => {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const fieldName = (index: number, type: SyntheticFieldType, prefix: string): string =>
  `${prefix}f_${String(index).padStart(5, '0')}_${type}`;

const propertyFor = (type: SyntheticFieldType) => {
  switch (type) {
    case 'keyword':
      return types.keyword({});
    case 'text':
      return types.text({});
    case 'match_only_text':
      return types.match_only_text({});
    case 'long':
      return types.long({});
    case 'double':
      return types.double({});
    case 'boolean':
      return types.boolean({});
    case 'date':
      return types.date({});
  }
};

/**
 * Builds a flat storage schema with exactly `numFields` top-level properties,
 * cycling through {@link FIELD_TYPE_CYCLE} so the field-count is precise and the
 * type mix is realistic.
 */
export const buildSchema = (numFields: number, fieldPrefix = ''): StorageSchema => {
  const properties: StorageSchema['properties'] = {};
  for (let i = 0; i < numFields; i++) {
    const type = FIELD_TYPE_CYCLE[i % FIELD_TYPE_CYCLE.length];
    properties[fieldName(i, type, fieldPrefix)] = propertyFor(type);
  }
  return { properties };
};

const randomString = (rng: () => number, length: number): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return out;
};

const randomSentence = (rng: () => number, words: number): string =>
  Array.from({ length: words }, () => randomString(rng, 3 + Math.floor(rng() * 8))).join(' ');

const valueFor = (type: SyntheticFieldType, rng: () => number): string | number | boolean => {
  switch (type) {
    case 'keyword':
      return randomString(rng, 12);
    case 'text':
      return randomSentence(rng, 12);
    case 'match_only_text':
      return randomSentence(rng, 20);
    case 'long':
      return Math.floor(rng() * 1_000_000);
    case 'double':
      return rng() * 1_000_000;
    case 'boolean':
      return rng() > 0.5;
    case 'date':
      return new Date(Date.now() - Math.floor(rng() * 1_000_000_000)).toISOString();
  }
};

/** Value types the synthetic generator can produce (matches the scalar field types above). */
export type SyntheticDocument = Record<string, string | number | boolean>;

/** Builds a single synthetic document matching a schema of `numFields` fields. */
export const buildDocument = (
  numFields: number,
  rng: () => number,
  fieldPrefix = ''
): SyntheticDocument => {
  const doc: SyntheticDocument = {};
  for (let i = 0; i < numFields; i++) {
    const type = FIELD_TYPE_CYCLE[i % FIELD_TYPE_CYCLE.length];
    doc[fieldName(i, type, fieldPrefix)] = valueFor(type, rng);
  }
  return doc;
};
