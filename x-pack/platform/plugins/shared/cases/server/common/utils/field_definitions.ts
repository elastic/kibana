/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { SavedObject } from '@kbn/core/server';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { FieldType, InlineFieldSchema } from '../../../common/types/domain/template/fields';
import type { FieldDefinition } from '../../../common/types/domain/field_definition/latest';
import {
  getV2FieldType,
  normalizeFieldDefinitionName,
} from '../../../common/utils/template_fields';
import { MAX_SNAKE_KEY_LENGTH, MAX_TITLE_LENGTH } from '../../../common/constants';

export { normalizeFieldDefinitionName };

interface LegacyCustomField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

/**
 * Strictly coerces a legacy toggle default to a boolean. Legacy toggle values are booleans in
 * practice, but the persisted config type allows `string | number | boolean`, so a truthy
 * `Boolean(value)` would wrongly map the string `'false'` to `true`. We therefore map only the
 * unambiguous boolean / `'true'` / `'false'` shapes and return `undefined` for anything else so
 * the caller omits the default rather than inventing one.
 */
const coerceLegacyToggleDefault = (value: string | number | boolean): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
};

/**
 * A field definition's persisted identity: the YAML `name` and storage `type`.
 * Together they form the `${name}_as_${type}` key under which case values are
 * stored in `extended_fields` and surfaced in Cases analytics.
 */
export interface FieldDefinitionIdentity {
  name: string;
  type: string;
}

/**
 * Extracts the identity from a field-definition YAML string. Returns
 * `undefined` when the YAML does not parse into a known inline field shape
 * (e.g. malformed legacy or imported definitions) — callers decide whether to
 * defer to full definition validation or skip identity comparison.
 */
export const parseFieldDefinitionIdentity = (
  definition: string
): FieldDefinitionIdentity | undefined => {
  try {
    const parsed = InlineFieldSchema.safeParse(parseYaml(definition));
    if (!parsed.success) {
      return undefined;
    }
    return { name: parsed.data.name, type: parsed.data.type };
  } catch {
    return undefined;
  }
};

/**
 * Every ES type an inline field definition can declare (source of truth:
 * `BaseFieldSchema.type` overrides in `common/types/domain/template/fields.ts`).
 * Used to reserve room for the longest possible `_as_<type>` storage-key suffix.
 */
const SUPPORTED_V2_FIELD_TYPES = [
  'keyword',
  'boolean',
  'date',
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
] as const;

const LONGEST_TYPE_SUFFIX_LENGTH = Math.max(
  ...SUPPORTED_V2_FIELD_TYPES.map((type) => `_as_${type}`.length)
);

/**
 * Effective bound for a generated field name: the Saved Object schema's title
 * limit, while always leaving room for the longest `_as_<type>` suffix inside
 * the analytics snake-key cap.
 */
export const MAX_GENERATED_FIELD_NAME_LENGTH = Math.min(
  MAX_TITLE_LENGTH,
  MAX_SNAKE_KEY_LENGTH - LONGEST_TYPE_SUFFIX_LENGTH
);

/** Stable 8-hex-char digest of a v1 legacy key, used for fallbacks and collision suffixes. */
const shortLegacyKeyHash = (legacyKey: string): string =>
  createHash('sha256').update(legacyKey).digest('hex').slice(0, 8);

const trimUnderscores = (value: string): string => value.replace(/^_+|_+$/g, '');

/**
 * Normalizes a v1 display label into an analytics-safe snake_case field name:
 * trim + lowercase, replace runs outside `[a-z0-9_]` with `_`, collapse
 * repeats, and strip leading/trailing separators. May return an empty string.
 */
export const normalizeLabelToFieldName = (label: string): string =>
  trimUnderscores(
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/_{2,}/g, '_')
  );

/**
 * Derives the deterministic, human-readable v2 field name for a migrated v1
 * custom field. Pure and input-order independent: the same label + legacy key
 * always produce the same name regardless of process order or restarts.
 *
 * - empty normalized label → `custom_field_<stable-hash-of-legacy-key>`
 * - collision (per `isNameTaken`, normalized-name semantics) → deterministic
 *   `_<hash>` suffix derived from the legacy key. The base is truncated to
 *   keep the suffix intact, so two long colliding labels remain distinct.
 */
export const generateFriendlyFieldName = ({
  label,
  legacyKey,
  isNameTaken,
}: {
  label: string;
  legacyKey: string;
  isNameTaken: (candidate: string) => boolean;
}): string => {
  let base = trimUnderscores(
    normalizeLabelToFieldName(label).slice(0, MAX_GENERATED_FIELD_NAME_LENGTH)
  );

  if (base.length === 0) {
    base = `custom_field_${shortLegacyKeyHash(legacyKey)}`;
  }

  if (!isNameTaken(base)) {
    return base;
  }

  const suffix = `_${shortLegacyKeyHash(legacyKey)}`;
  const truncatedBase = trimUnderscores(
    base.slice(0, MAX_GENERATED_FIELD_NAME_LENGTH - suffix.length)
  );

  return `${truncatedBase}${suffix}`;
};

/**
 * Fixed RFC 4122 namespace for Cases field-definition ids. Never change this
 * value: deterministic ids derived from it are persisted as Saved Object ids.
 */
export const CASES_FIELD_DEFINITION_ID_NAMESPACE = '2f2b0631-8e28-4f0d-a8ab-f94d4c04a4b6';

/**
 * Derives the deterministic 36-character UUIDv5 Saved Object id for a
 * migration/mirroring-created field definition. `spaceId` participates because
 * the type is `multiple-isolated` while Saved Object ids are globally unique.
 * The NUL separator makes the encoding unambiguous (no component can contain it).
 *
 * The same value is always written to both the Saved Object `id` and
 * `attributes.fieldDefinitionId` (existing invariant: `id === fieldDefinitionId`).
 */
export const deriveFieldDefinitionId = ({
  spaceId,
  owner,
  name,
}: {
  spaceId: string;
  owner: string;
  name: string;
}): string => uuidv5([spaceId, owner, name].join('\u0000'), CASES_FIELD_DEFINITION_ID_NAMESPACE);

/**
 * Builds a normalized (case-insensitive) name → definition index from any array of
 * objects. Generic so the hook can index `FieldDefinition` values while the migration
 * task indexes `SavedObject<FieldDefinition>` values without an intermediate mapping
 * step.
 */
export const buildFieldDefinitionNameIndex = <T>(
  defs: T[],
  getName: (def: T) => string
): Map<string, T> => {
  const index = new Map<string, T>();
  for (const def of defs) {
    const key = normalizeFieldDefinitionName(getName(def));
    if (!index.has(key)) {
      // First-wins: stable behaviour when duplicates already exist.
      index.set(key, def);
    }
  }
  return index;
};

/**
 * Builds a YAML string for a single FieldSchema entry from a legacy custom field configuration.
 *
 * `name` is the definition's permanent v2 identity — callers derive it once via
 * {@link generateFriendlyFieldName} (label-derived) and record the v1 `key` in the
 * server-managed `legacyKey` attribute instead of reusing it as the name. When no
 * explicit name is provided (e.g. comparison YAML for an existing definition), the
 * legacy `key` is used, matching pre-friendly-name behavior.
 */
export const buildFieldDefinitionYaml = (
  legacy: LegacyCustomField,
  options: { name?: string } = {}
): { name: string; yaml: string } => {
  const { key, label, type, required, defaultValue } = legacy;
  const name = options.name ?? key;

  const fieldDef: Record<string, unknown> = {
    name,
    label,
  };

  if (required) {
    fieldDef.validation = { required: true };
  }

  fieldDef.type = getV2FieldType(type);

  if (type === CustomFieldTypes.TEXT) {
    fieldDef.control = FieldType.INPUT_TEXT;
    if (defaultValue !== null && defaultValue !== undefined) {
      fieldDef.metadata = { default: String(defaultValue) };
    }
  } else if (type === CustomFieldTypes.NUMBER) {
    fieldDef.control = FieldType.INPUT_NUMBER;
    if (defaultValue !== null && defaultValue !== undefined) {
      const asNum = Number(defaultValue);
      if (!Number.isNaN(asNum)) {
        fieldDef.metadata = { default: asNum };
      }
    }
  } else if (type === CustomFieldTypes.TOGGLE) {
    // Legacy toggle maps directly to the native v2 TOGGLE control.
    fieldDef.control = FieldType.TOGGLE;
    if (defaultValue !== null && defaultValue !== undefined) {
      const toggleDefault = coerceLegacyToggleDefault(defaultValue);
      if (toggleDefault !== undefined) {
        fieldDef.metadata = { default: toggleDefault };
      }
    }
  } else {
    // Unknown type: store as plain keyword text field
    fieldDef.control = FieldType.INPUT_TEXT;
  }

  return { name, yaml: stringifyYaml(fieldDef, { lineWidth: 0 }) };
};

/**
 * Strips the server-managed `legacyKey` from an exported field-definition SO.
 *
 * `legacyKey` asserts "this definition is the canonical link for v1 custom-field key X in this
 * space/owner" — an invariant that only holds in the space it was written in. Exporting is used
 * to copy definitions elsewhere (a different space, deployment, or "create new copies" import),
 * where that link no longer applies and, worse, could collide with a definition already holding
 * the same `legacyKey` at the destination (surfaced as a hard `duplicate_legacy_key` failure on
 * every future configure write for that owner). Dropping it makes an exported copy a plain,
 * unlinked global field; if it lands back in its original space with a still-configured v1 field
 * of the same name, ordinary name-fallback resolution re-links and repairs it.
 */
export const stripLegacyKeyForExport = (
  savedObject: SavedObject<FieldDefinition>
): SavedObject<FieldDefinition> => {
  if (savedObject.attributes.legacyKey === undefined) {
    return savedObject;
  }
  const { legacyKey, ...attributesWithoutLegacyKey } = savedObject.attributes;
  return { ...savedObject, attributes: attributesWithoutLegacyKey };
};
