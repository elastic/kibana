/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { mapValues } from 'lodash';
import { isRecord } from './types';

// Smallest repeated subtree worth sharing, below which a reference saves little over the copy
const MIN_SHARED_SUBTREE_CHARS = 256;

// Hash characters a definition name carries, lengthened to the full hash only on a collision
const NAME_HASH_LENGTH = 8;

const DEFAULT_NAME_HINT = 'inline';

// Keywords whose value maps names to subschemas
const SCHEMA_MAP_KEYWORDS = ['patternProperties', 'properties'] as const;

// Keywords whose value is a subschema or a list of them
const SUBSCHEMA_KEYWORDS = [
  'additionalProperties',
  'allOf',
  'anyOf',
  'items',
  'not',
  'oneOf',
  'prefixItems',
] as const;

/** Key the hoisted definitions are referenced under, and registered under in a schema closure. */
export const INLINE_DEFINITIONS_FILE = 'inline';

type Schema = Record<string, unknown>;

interface SchemaChild {
  schema: Schema;
  propertyName?: string;
}

export interface InlineDefinitions {
  root: Schema;
  definitions: Record<string, Schema>;
}

const schemaChildrenOf = (node: Schema): SchemaChild[] => {
  const children: SchemaChild[] = [];

  for (const keyword of SCHEMA_MAP_KEYWORDS) {
    const entries = node[keyword];
    if (isRecord(entries)) {
      for (const [name, child] of Object.entries(entries)) {
        if (isRecord(child)) {
          children.push({
            schema: child,
            propertyName: keyword === 'properties' ? name : undefined,
          });
        }
      }
    }
  }

  for (const keyword of SUBSCHEMA_KEYWORDS) {
    const value = node[keyword];
    for (const child of Array.isArray(value) ? value : [value]) {
      if (isRecord(child)) {
        children.push({ schema: child });
      }
    }
  }

  return children;
};

const mapSchemaChildren = (node: Schema, replacements: Map<Schema, Schema>): Schema => {
  const replace = (value: unknown): unknown =>
    isRecord(value) ? replacements.get(value) ?? value : value;
  const mapped: Schema = { ...node };

  for (const keyword of SCHEMA_MAP_KEYWORDS) {
    const entries = node[keyword];
    if (isRecord(entries)) {
      mapped[keyword] = mapValues(entries, replace);
    }
  }

  for (const keyword of SUBSCHEMA_KEYWORDS) {
    const value = node[keyword];
    if (Array.isArray(value)) {
      mapped[keyword] = value.map(replace);
    } else if (isRecord(value)) {
      mapped[keyword] = replace(value);
    }
  }

  return mapped;
};

const toNameHint = (propertyName: string): string =>
  propertyName.replace(/[^\w-]/g, '_') || DEFAULT_NAME_HINT;

const referenceTo = (name: string): Schema => ({
  $ref: `${INLINE_DEFINITIONS_FILE}#/$defs/${name}`,
});

/**
 * Deduplicates the inline subtrees a schema repeats by hoisting each into a named definition, the
 * way a spec's shared components are, so every copy references one definition instead of spelling
 * it out again. Repeats too small to be worth a reference stay inline.
 *
 * @param schema - The schema to rewrite, typically an API's `input`. It is left unmodified, and
 * returned as is when nothing repeats.
 * @returns The rewritten schema, which points at the hoisted subtrees through
 * {@link INLINE_DEFINITIONS_FILE} references, and the definitions keyed by name. A name pairs the
 * nearest enclosing property name with a hash of the subtree's content, so it is stable for a
 * given schema and identical copies share it.
 */
export const dedupeInlineDefinitions = (schema: Schema): InlineDefinitions => {
  const hashes = new Map<Schema, string>();
  const occurrences = new Map<string, number>();
  const namesByHash = new Map<string, string>();
  const definitions = new Map<string, Schema>();
  // Undefined for a subtree left unchanged, so every copy of it is returned as itself.
  const shrunkByHash = new Map<string, Schema | undefined>();

  const hashOf = (node: Schema): string => {
    let hash = hashes.get(node);
    if (!hash) {
      hash = createHash('sha256').update(JSON.stringify(node)).digest('hex');
      hashes.set(node, hash);
    }
    return hash;
  };

  const countOccurrences = (node: Schema): void => {
    for (const { schema: child } of schemaChildrenOf(node)) {
      const hash = hashOf(child);
      const seen = occurrences.get(hash) ?? 0;
      occurrences.set(hash, seen + 1);
      // A repeated subtree is shared as a whole, so its descendants are counted in one copy only.
      if (seen === 0) {
        countOccurrences(child);
      }
    }
  };

  const hoist = (original: Schema, shrunk: Schema, hint: string): Schema => {
    const hash = hashOf(original);
    let name = namesByHash.get(hash);
    if (!name) {
      const shortName = `${hint}.${hash.slice(0, NAME_HASH_LENGTH)}`;
      name = definitions.has(shortName) ? `${hint}.${hash}` : shortName;
      namesByHash.set(hash, name);
      definitions.set(name, shrunk);
    }
    return referenceTo(name);
  };

  const shrink = (node: Schema, hint: string): Schema => {
    const hash = hashOf(node);
    if (shrunkByHash.has(hash)) {
      return shrunkByHash.get(hash) ?? node;
    }

    const replacements = new Map<Schema, Schema>();

    for (const { schema: child, propertyName } of schemaChildrenOf(node)) {
      const childHint = propertyName === undefined ? hint : toNameHint(propertyName);
      const shrunk = shrink(child, childHint);
      const repeated = (occurrences.get(hashOf(child)) ?? 0) > 1;
      const worthSharing = repeated && JSON.stringify(shrunk).length > MIN_SHARED_SUBTREE_CHARS;
      replacements.set(child, worthSharing ? hoist(child, shrunk, childHint) : shrunk);
    }

    const unchanged = Array.from(replacements).every(([child, value]) => child === value);
    if (unchanged) {
      shrunkByHash.set(hash, undefined);
      return node;
    }

    const rebuilt = mapSchemaChildren(node, replacements);
    shrunkByHash.set(hash, rebuilt);
    return rebuilt;
  };

  countOccurrences(schema);
  const root = shrink(schema, DEFAULT_NAME_HINT);

  return { root, definitions: Object.fromEntries(definitions) };
};
