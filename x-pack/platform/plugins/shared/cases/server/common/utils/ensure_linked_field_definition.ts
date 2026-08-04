/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import {
  buildFieldDefinitionYaml,
  deriveFieldDefinitionId,
  generateFriendlyFieldName,
  normalizeFieldDefinitionName,
} from './field_definitions';
import type { FieldLinkIndexes, LinkableFieldDefinition } from './field_link_resolution';
import { resolveDefinitionForLegacyField } from './field_link_resolution';

interface LegacyCustomFieldInput {
  key: string;
  type: string;
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

export type EnsureLinkedFieldDefinitionOutcome =
  | {
      outcome: 'reused';
      definition: FieldDefinition;
      needsLegacyKeyRepair: boolean;
      /**
       * The index entry the link resolved through (carries the SO `version` for
       * OCC `legacyKey` repair). Undefined when the reuse came from converging
       * on a concurrent creator's definition, which never needs repair.
       */
      link?: LinkableFieldDefinition;
    }
  | { outcome: 'created'; definition: FieldDefinition }
  | {
      outcome: 'blocked';
      reason:
        | 'duplicate_legacy_key'
        | 'type_mismatch'
        | 'unparseable_definition'
        | 'ambiguous_name_match';
    };

export interface EnsureLinkedFieldDefinitionDeps {
  spaceId: string;
  owner: string;
  /**
   * Creates the definition Saved Object with the given deterministic id and
   * `overwrite: false` semantics. Must reject with an SO conflict error when
   * the id already exists (concurrent creator won). The return value is
   * ignored — the locally-built attributes are authoritative.
   */
  createDefinition: (attributes: FieldDefinition, id: string) => Promise<unknown>;
  /** Fetches a definition by SO id; returns undefined when it does not exist. */
  fetchDefinitionById: (id: string) => Promise<FieldDefinition | undefined>;
}

/**
 * Resolves-or-creates the v2 field definition linked to one configured v1
 * custom field, with deterministic friendly naming (label-derived) and
 * deterministic UUIDv5 ids so concurrent migration/mirroring runs converge on
 * a single definition.
 *
 * - An existing link (via `legacyKey`, exact, or unique normalized name) is
 *   reused; the caller handles opportunistic `legacyKey` repair.
 * - Malformed linkage (duplicate `legacyKey`, type mismatch, unparseable
 *   definition) and ambiguous name matches are surfaced as `blocked` — callers
 *   fail the configuration write (A1) or count the field as unmigratable.
 * - On a create conflict (deterministic id already taken), the winner is
 *   refetched: same `(owner, legacyKey)` → reuse; otherwise the base name
 *   belongs to another field, so the deterministic legacy-key-suffixed name is
 *   used instead.
 *
 * The caller mutates its own name index after a create (in-loop, #282060
 * style) via the returned definition.
 */
export const ensureLinkedFieldDefinition = async (
  customField: LegacyCustomFieldInput,
  indexes: FieldLinkIndexes,
  deps: EnsureLinkedFieldDefinitionDeps
): Promise<EnsureLinkedFieldDefinitionOutcome> => {
  const resolution = resolveDefinitionForLegacyField(customField, indexes);

  if (resolution.status === 'malformed') {
    return { outcome: 'blocked', reason: resolution.reason };
  }
  if (resolution.status === 'unresolved' && resolution.reason === 'ambiguous_name_match') {
    return { outcome: 'blocked', reason: 'ambiguous_name_match' };
  }
  if (resolution.status === 'resolved') {
    return {
      outcome: 'reused',
      definition: resolution.link.definition,
      needsLegacyKeyRepair: resolution.needsLegacyKeyRepair,
      link: resolution.link,
    };
  }

  const isNameTaken = (candidate: string): boolean =>
    indexes.byNormalizedName.has(normalizeFieldDefinitionName(candidate));

  const baseName = generateFriendlyFieldName({
    label: customField.label,
    legacyKey: customField.key,
    isNameTaken,
  });

  const created = await createWithConflictFallback(customField, baseName, deps);
  return created;
};

const buildAttributes = (
  customField: LegacyCustomFieldInput,
  name: string,
  deps: EnsureLinkedFieldDefinitionDeps
): { attributes: FieldDefinition; id: string } => {
  const { yaml } = buildFieldDefinitionYaml(customField, { name });
  const id = deriveFieldDefinitionId({ spaceId: deps.spaceId, owner: deps.owner, name });
  return {
    id,
    attributes: {
      fieldDefinitionId: id,
      name,
      owner: deps.owner,
      definition: yaml,
      description: customField.label,
      isGlobal: true,
      legacyKey: customField.key,
    },
  };
};

const createWithConflictFallback = async (
  customField: LegacyCustomFieldInput,
  baseName: string,
  deps: EnsureLinkedFieldDefinitionDeps
): Promise<EnsureLinkedFieldDefinitionOutcome> => {
  const base = buildAttributes(customField, baseName, deps);

  try {
    await deps.createDefinition(base.attributes, base.id);
    return { outcome: 'created', definition: base.attributes };
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }
  }

  // A concurrent creator claimed the deterministic id. If it created the same
  // link, converge on it; otherwise the base name belongs to another field and
  // the deterministic legacy-key-suffixed name disambiguates.
  const winner = await deps.fetchDefinitionById(base.id);
  if (winner && winner.owner === deps.owner && winner.legacyKey === customField.key) {
    return { outcome: 'reused', definition: winner, needsLegacyKeyRepair: false };
  }

  const suffixedName = generateFriendlyFieldName({
    label: customField.label,
    legacyKey: customField.key,
    isNameTaken: () => true,
  });
  const suffixed = buildAttributes(customField, suffixedName, deps);

  try {
    await deps.createDefinition(suffixed.attributes, suffixed.id);
    return { outcome: 'created', definition: suffixed.attributes };
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }
    // Second conflict: only a concurrent run creating the same link can own
    // this fully deterministic id. Converge or surface the conflict.
    const suffixedWinner = await deps.fetchDefinitionById(suffixed.id);
    if (
      suffixedWinner &&
      suffixedWinner.owner === deps.owner &&
      suffixedWinner.legacyKey === customField.key
    ) {
      return { outcome: 'reused', definition: suffixedWinner, needsLegacyKeyRepair: false };
    }
    throw error;
  }
};

const isConflictError = (error: unknown): boolean =>
  SavedObjectsErrorHelpers.isConflictError(error as Error);
