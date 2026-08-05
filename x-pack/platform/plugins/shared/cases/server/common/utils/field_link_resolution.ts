/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import { getFieldSnakeKey, getV2FieldType } from '../../../common/utils/template_fields';
import type { FieldDefinitionIdentity } from './field_definitions';
import { normalizeFieldDefinitionName, parseFieldDefinitionIdentity } from './field_definitions';

/**
 * One owner/space field definition prepared for link resolution: its attributes,
 * the parsed YAML identity (undefined when the stored YAML is malformed), and —
 * when the caller loaded full Saved Objects — the SO version for OCC link repair.
 */
export interface LinkableFieldDefinition {
  definition: FieldDefinition;
  identity?: FieldDefinitionIdentity;
  version?: string;
}

/**
 * In-memory owner/space-scoped link indexes (the #282060 pattern). `legacyKey`
 * is intentionally unmapped on the Saved Object, so resolution NEVER queries
 * Elasticsearch by it: callers load the bounded owner/space definition set (at
 * most MAX_FIELD_DEFINITIONS_PER_OWNER) once per request and resolve here.
 */
export interface FieldLinkIndexes {
  all: LinkableFieldDefinition[];
  byLegacyKey: Map<string, LinkableFieldDefinition[]>;
  byExactName: Map<string, LinkableFieldDefinition[]>;
  byNormalizedName: Map<string, LinkableFieldDefinition[]>;
}

const push = <K>(
  map: Map<K, LinkableFieldDefinition[]>,
  key: K,
  value: LinkableFieldDefinition
) => {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(value);
  } else {
    map.set(key, [value]);
  }
};

interface FieldDefinitionSO {
  attributes: FieldDefinition;
  version?: string;
}

// Discriminate on a required FieldDefinition-only property so a future
// `attributes` field on FieldDefinition wouldn't silently break the check.
const isFieldDefinitionSO = (
  entry: FieldDefinitionSO | FieldDefinition
): entry is FieldDefinitionSO => !('fieldDefinitionId' in entry);

export const buildFieldLinkIndexes = (
  definitions: Array<FieldDefinitionSO | FieldDefinition>
): FieldLinkIndexes => {
  const all: LinkableFieldDefinition[] = definitions.map((entry) => {
    const isSO = isFieldDefinitionSO(entry);
    const attributes = isSO ? entry.attributes : entry;
    return {
      definition: attributes,
      identity: parseFieldDefinitionIdentity(attributes.definition),
      version: isSO ? entry.version : undefined,
    };
  });

  const indexes: FieldLinkIndexes = {
    all,
    byLegacyKey: new Map(),
    byExactName: new Map(),
    byNormalizedName: new Map(),
  };

  for (const linkable of all) {
    const { legacyKey, name } = linkable.definition;
    if (legacyKey !== undefined) {
      push(indexes.byLegacyKey, legacyKey, linkable);
    }
    push(indexes.byExactName, name, linkable);
    push(indexes.byNormalizedName, normalizeFieldDefinitionName(name), linkable);
  }

  return indexes;
};

/**
 * Registers a just-created definition (or a just-repaired link) in the
 * in-memory indexes so intra-request duplicate keys and later name collisions
 * see it — the in-loop index update from #282060.
 */
export const addDefinitionToIndexes = (
  indexes: FieldLinkIndexes,
  definition: FieldDefinition,
  version?: string
): void => {
  const linkable: LinkableFieldDefinition = {
    definition,
    identity: parseFieldDefinitionIdentity(definition.definition),
    version,
  };
  indexes.all.push(linkable);
  if (definition.legacyKey !== undefined) {
    push(indexes.byLegacyKey, definition.legacyKey, linkable);
  }
  push(indexes.byExactName, definition.name, linkable);
  push(indexes.byNormalizedName, normalizeFieldDefinitionName(definition.name), linkable);
};

/**
 * Records a successful opportunistic `legacyKey` repair on the already-indexed
 * entry (no re-insertion, so name indexes keep exactly one entry per SO). A
 * duplicate key later in the same request then resolves through the exact
 * `legacyKey` path.
 */
export const registerRepairedLegacyKey = (
  indexes: FieldLinkIndexes,
  linkable: LinkableFieldDefinition,
  legacyKey: string
): void => {
  linkable.definition = { ...linkable.definition, legacyKey };
  push(indexes.byLegacyKey, legacyKey, linkable);
};

export type LegacyFieldResolution =
  | {
      status: 'resolved';
      link: LinkableFieldDefinition;
      /** `${definition.name}_as_${parsedType}` — never derived from the raw v1 key. */
      storageKey: string;
      /**
       * True when the link was found through a name fallback and the definition
       * has no persisted `legacyKey` yet — callers may opportunistically persist
       * it with OCC (and must skip repair, not fail, when that write conflicts).
       */
      needsLegacyKeyRepair: boolean;
    }
  | {
      status: 'unresolved';
      reason: 'no_match' | 'ambiguous_name_match';
    }
  | {
      status: 'malformed';
      reason: 'duplicate_legacy_key' | 'type_mismatch' | 'unparseable_definition';
    };

const isTypeCompatible = (linkable: LinkableFieldDefinition, v1Type: string): boolean =>
  linkable.identity !== undefined && linkable.identity.type === getV2FieldType(v1Type);

// The storage key uses the immutable attribute name (identity-locked by PR-A)
// plus the parsed YAML type — never the raw v1 key.
const toResolved = (
  linkable: LinkableFieldDefinition,
  identity: FieldDefinitionIdentity,
  needsLegacyKeyRepair: boolean
): LegacyFieldResolution => ({
  status: 'resolved',
  link: linkable,
  storageKey: getFieldSnakeKey(linkable.definition.name, identity.type),
  needsLegacyKeyRepair,
});

/**
 * Resolves a configured v1 custom field `(key, type)` to its owner/space field
 * definition. Resolution order (per the field-identity plan):
 *
 * 1. exact `legacyKey` match — requires exactly one candidate and a compatible
 *    type; duplicates or a type mismatch are **malformed linkage** and block
 *    this field rather than guessing (A4);
 * 2. byte-exact immutable-name match (pre-friendly-name definitions whose name
 *    IS the v1 key) — must be unique, type-compatible, and not already linked
 *    to a different v1 key; resolvable with `needsLegacyKeyRepair`;
 * 3. normalized (trim + lowercase) immutable-name match — only when exactly one
 *    owner/type-compatible candidate matches; also repairable. Zero or multiple
 *    matches are unresolved (skip + diagnostic, never first-wins).
 *
 * Label-derived normalized names are deliberately NOT consulted here; they are
 * a dedup concern for creation paths, never a permanent link.
 */
export const resolveDefinitionForLegacyField = (
  { key, type }: { key: string; type: string },
  indexes: FieldLinkIndexes
): LegacyFieldResolution => {
  const byLegacyKey = indexes.byLegacyKey.get(key) ?? [];

  if (byLegacyKey.length > 1) {
    return { status: 'malformed', reason: 'duplicate_legacy_key' };
  }

  if (byLegacyKey.length === 1) {
    const [candidate] = byLegacyKey;
    if (candidate.identity === undefined) {
      return { status: 'malformed', reason: 'unparseable_definition' };
    }
    if (!isTypeCompatible(candidate, type)) {
      return { status: 'malformed', reason: 'type_mismatch' };
    }
    return toResolved(candidate, candidate.identity, false);
  }

  // A definition already linked to a different v1 key can never be a name-based
  // candidate for this one.
  const isFallbackCandidate = (
    linkable: LinkableFieldDefinition
  ): linkable is LinkableFieldDefinition & { identity: FieldDefinitionIdentity } =>
    linkable.definition.legacyKey === undefined && isTypeCompatible(linkable, type);

  const byExactName = (indexes.byExactName.get(key) ?? []).filter(isFallbackCandidate);
  if (byExactName.length === 1) {
    return toResolved(byExactName[0], byExactName[0].identity, true);
  }
  if (byExactName.length > 1) {
    return { status: 'unresolved', reason: 'ambiguous_name_match' };
  }

  const byNormalizedName = (
    indexes.byNormalizedName.get(normalizeFieldDefinitionName(key)) ?? []
  ).filter(isFallbackCandidate);
  if (byNormalizedName.length === 1) {
    return toResolved(byNormalizedName[0], byNormalizedName[0].identity, true);
  }
  if (byNormalizedName.length > 1) {
    return { status: 'unresolved', reason: 'ambiguous_name_match' };
  }

  return { status: 'unresolved', reason: 'no_match' };
};

/**
 * Returns the definitions in `indexes` that are **actively linked** to the
 * given configured v1 custom fields — i.e. some configured `(key, type)`
 * resolves to them. Used by the delete / `isGlobal`-demotion guards (A4) and
 * active-link parity logic. Malformed/ambiguous resolutions contribute no
 * active link (those fields are blocked or skipped elsewhere).
 */
export const getActivelyLinkedDefinitionIds = (
  configuredFields: Array<{ key: string; type: string }>,
  indexes: FieldLinkIndexes
): Set<string> => {
  const ids = new Set<string>();
  for (const configuredField of configuredFields) {
    const resolution = resolveDefinitionForLegacyField(configuredField, indexes);
    if (resolution.status === 'resolved') {
      ids.add(resolution.link.definition.fieldDefinitionId);
    }
  }
  return ids;
};
