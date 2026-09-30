/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import type { FieldLinkageMalformedErrorAttributes } from '../../../common/constants/error_codes';
import { createTypedApiError } from '../api_errors';
import type { FieldLinkIndexes } from './field_link_resolution';
import { resolveDefinitionForLegacyField } from './field_link_resolution';
import type { LegacyFieldValue } from './field_value_codecs';
import {
  areFieldRepresentationsEqual,
  decodeStorageFieldValue,
  encodeLegacyFieldValue,
} from './field_value_codecs';

/**
 * The write-time pairing adapter (plan Unit 2 §4–§5): every case write that
 * touches an **actively linked** field derives the other representation before
 * one case Saved Object write is committed. `customFields` input writes the
 * linked `${name}_as_${type}` entry; `extended_fields` input writes the linked
 * `customFields` entry — through the reversible codecs, never `String(value)`.
 *
 * Pairing for existing links runs independently of
 * `xpack.cases.templates.enabled` (addendum A1): once a link exists, live sync
 * must not depend on the feature flag.
 *
 * Empty-value semantics (addendum A2):
 * - an omitted representation is "not part of this request";
 * - explicit v1 `null` clears the linked v2 key;
 * - explicit v2 `''` clears: the v2 key is removed and the linked v1 entry is
 *   set to its canonical empty value (`null`);
 * - the canonical v1 empty value and an absent v2 key are semantically equal.
 *
 * Conflicting explicit dual input for one linked field is rejected with a
 * structured 400 (`field_representations_conflict`) — object-property order is
 * not a clock, so no side silently wins.
 */

/** Matches the persisted case customFields shape (`CasePersistedCustomFields`). */
export interface LegacyCaseCustomField {
  key: string;
  type: string;
  value: unknown;
}

type MalformedField = FieldLinkageMalformedErrorAttributes['fields'][number];

/** One configured v1 field resolved to its linked definition. */
interface ActiveFieldLink {
  key: string;
  type: string;
  storageKey: string;
  /** Immutable v2 definition name (safe for error attributes — never a value). */
  name: string;
}

export interface ActiveLinkMaps {
  byKey: Map<string, ActiveFieldLink>;
  byStorageKey: Map<string, ActiveFieldLink>;
  /** Configured keys whose linkage is broken — blocks a write touching them. */
  malformedByKey: Map<string, MalformedField>;
  /** Configured keys with no (or an ambiguous) link — skipped with a diagnostic. */
  unresolvedKeys: Set<string>;
}

/**
 * Resolves every configured v1 field against the owner's link indexes once per
 * request. Only resolved links participate in pairing; malformed linkage blocks
 * a write that touches the key, and unresolved keys are skipped (mirroring is
 * deferred until the configure path creates the link).
 */
export const buildActiveLinkMaps = (
  configuredFields: Array<{ key: string; type: string }>,
  indexes: FieldLinkIndexes
): ActiveLinkMaps => {
  const maps: ActiveLinkMaps = {
    byKey: new Map(),
    byStorageKey: new Map(),
    malformedByKey: new Map(),
    unresolvedKeys: new Set(),
  };

  for (const { key, type } of configuredFields) {
    const resolution = resolveDefinitionForLegacyField({ key, type }, indexes);
    if (resolution.status === 'resolved') {
      const link: ActiveFieldLink = {
        key,
        type,
        storageKey: resolution.storageKey,
        name: resolution.link.definition.name,
      };
      maps.byKey.set(key, link);
      maps.byStorageKey.set(resolution.storageKey, link);
    } else if (resolution.status === 'malformed') {
      maps.malformedByKey.set(key, { key, reason: resolution.reason });
    } else {
      maps.unresolvedKeys.add(key);
    }
  }

  return maps;
};

export interface PairedFieldsResult {
  /**
   * The full customFields array to persist, or `undefined` when pairing did
   * not change the v1 side (callers keep persisting their own base array).
   */
  customFields: LegacyCaseCustomField[] | undefined;
  /**
   * The extended_fields map to persist. Same-reference no-op semantics: when
   * nothing changed this is the exact `baseExtendedFields` reference.
   */
  extendedFields: Record<string, unknown> | null | undefined;
  /** Immutable v2 names of linked fields with conflicting explicit dual input. */
  conflictFields: string[];
  /** Codec failures — the write is rejected, values are never guessed. */
  invalidValues: Array<{ storageKey: string; error: string }>;
  /** Request-touched v1 keys with broken linkage (rejects the write). */
  malformedFields: MalformedField[];
  /** Request-touched v1 keys with no link — skipped with a diagnostic. */
  unresolvedKeys: string[];
  /**
   * v1 key → linked storage key for every linked field this request paired.
   * The user-action layer uses it to suppress the duplicate legacy
   * `customFields` activity when the canonical `extended_fields` activity
   * records the same edit (#282474).
   */
  pairedKeyToStorageKey: Record<string, string>;
}

const upsertCustomFieldValue = (
  customFields: LegacyCaseCustomField[],
  link: ActiveFieldLink,
  value: LegacyFieldValue
): LegacyCaseCustomField[] => {
  const index = customFields.findIndex((cf) => cf.key === link.key);
  const entry: LegacyCaseCustomField = { key: link.key, type: link.type, value };
  if (index === -1) {
    return [...customFields, entry];
  }
  if (customFields[index].value === value) {
    return customFields;
  }
  const next = [...customFields];
  next[index] = entry;
  return next;
};

const isSameExtendedFieldsValue = (
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key]);
};

/**
 * Pairs the two representations for one case update request.
 *
 * - `requestCustomFields` / `requestExtendedFields` are the RAW caller-supplied
 *   values (caller intent) — never post-fill or post-merge derivatives, so
 *   synthetic nulls and PATCH-merged keys are not mistaken for explicit input.
 * - `baseCustomFields` is the array the update would otherwise persist (the
 *   filled request array, or the existing case array when the request omits
 *   customFields).
 * - `baseExtendedFields` is the map the update would otherwise persist (the
 *   PATCH-merged map, or the existing case map).
 */
export const pairUpdatedCaseFields = ({
  requestCustomFields,
  requestExtendedFields,
  baseCustomFields,
  baseExtendedFields,
  links,
}: {
  requestCustomFields: LegacyCaseCustomField[] | undefined;
  requestExtendedFields: Record<string, unknown> | undefined;
  baseCustomFields: LegacyCaseCustomField[];
  baseExtendedFields: Record<string, unknown> | null | undefined;
  links: ActiveLinkMaps;
}): PairedFieldsResult => {
  const result = initResult(baseExtendedFields);
  const mergedExtendedFields: Record<string, unknown> = { ...(baseExtendedFields ?? {}) };
  const extendedFieldsInput = requestExtendedFields ?? {};
  let pairedCustomFields = baseCustomFields;

  const explicitV1 = new Map((requestCustomFields ?? []).map((cf) => [cf.key, cf]));

  // v1-touched keys: mirror into the linked storage key (customFields intent).
  const pairV1TouchedKey = (cf: LegacyCaseCustomField): void => {
    const link = links.byKey.get(cf.key);
    if (link === undefined) {
      collectUnlinked(result, links, cf.key);
      return;
    }

    const v2 = readExplicitValue(requestExtendedFields, link.storageKey);
    if (
      v2.explicit &&
      !areFieldRepresentationsEqual(link.type, cf.value as LegacyFieldValue, v2.value)
    ) {
      result.conflictFields.push(link.name);
      return;
    }

    // v1-only input, or semantically equal dual input — v1 is canonical.
    applyV1ToV2(result, mergedExtendedFields, link, cf.value as LegacyFieldValue);
  };

  for (const cf of requestCustomFields ?? []) {
    pairV1TouchedKey(cf);
  }

  // v2-touched keys: derive the linked v1 entry (extended_fields intent).
  // Unlinked keys pass through untouched; explicit dual input was already
  // handled (conflict or canonical pair) in the v1 loop.
  for (const storageKey of Object.keys(extendedFieldsInput)) {
    const link = links.byStorageKey.get(storageKey);
    if (link !== undefined && !explicitV1.has(link.key)) {
      pairedCustomFields = applyV2ToV1(
        result,
        mergedExtendedFields,
        pairedCustomFields,
        link,
        String(extendedFieldsInput[storageKey])
      );
    }
  }

  return finalizeResult(result, {
    baseExtendedFields,
    mergedExtendedFields,
    baseCustomFields,
    pairedCustomFields,
  });
};

/**
 * Pairs the two representations for a create request, applying the default
 * precedence of addendum A2 per linked field:
 *
 * 1. conflicting explicit values on both sides → structured 400;
 * 2. one explicit value → it wins over any default;
 * 3. no explicit value, but the template supplied a v2 default → the template
 *    default wins and is copied to v1;
 * 4. otherwise the v1 configuration default (already filled into
 *    `effectiveCustomFields`) is copied to v2;
 * 5. the caller pairs and validates the final effective values.
 *
 * `callerCustomFields` / `callerExtendedFields` are the RAW request values
 * (caller intent, captured before template expansion). `effectiveCustomFields`
 * is the post-fill array and `effectiveExtendedFields` the post-template-merge
 * map — the values the create would otherwise persist.
 */
export const pairCreatedCaseFields = ({
  callerCustomFields,
  callerExtendedFields,
  effectiveCustomFields,
  effectiveExtendedFields,
  links,
}: {
  callerCustomFields: LegacyCaseCustomField[] | undefined;
  callerExtendedFields: Record<string, unknown> | undefined;
  effectiveCustomFields: LegacyCaseCustomField[];
  effectiveExtendedFields: Record<string, unknown> | null | undefined;
  links: ActiveLinkMaps;
}): PairedFieldsResult => {
  const result = initResult(effectiveExtendedFields);
  const mergedExtendedFields: Record<string, unknown> = { ...(effectiveExtendedFields ?? {}) };
  let pairedCustomFields = effectiveCustomFields;

  const explicitV1 = new Map((callerCustomFields ?? []).map((cf) => [cf.key, cf]));

  // Surface broken linkage for any explicitly-touched v1 key.
  for (const key of explicitV1.keys()) {
    if (links.byKey.get(key) === undefined) {
      collectUnlinked(result, links, key);
    }
  }

  // Applies the A2 precedence for one linked field and returns the (possibly
  // replaced) customFields array.
  const pairLinkedField = (link: ActiveFieldLink): LegacyCaseCustomField[] => {
    const v1Entry = explicitV1.get(link.key);
    const v2 = readExplicitValue(callerExtendedFields, link.storageKey);

    if (
      v1Entry !== undefined &&
      v2.explicit &&
      !areFieldRepresentationsEqual(link.type, v1Entry.value as LegacyFieldValue, v2.value)
    ) {
      result.conflictFields.push(link.name);
      return pairedCustomFields;
    }

    if (v1Entry !== undefined) {
      // Explicit v1 (possibly matched by an equal explicit v2) — v1 is canonical.
      applyV1ToV2(result, mergedExtendedFields, link, v1Entry.value as LegacyFieldValue);
      return pairedCustomFields;
    }

    if (v2.explicit) {
      // Explicit v2 only — derive v1, overriding any filled configuration default.
      return applyV2ToV1(result, mergedExtendedFields, pairedCustomFields, link, v2.value);
    }

    // No explicit value on either side: a template's v2 default wins and is
    // copied to v1.
    const templateDefault = mergedExtendedFields[link.storageKey];
    if (templateDefault !== undefined) {
      return applyV2ToV1(
        result,
        mergedExtendedFields,
        pairedCustomFields,
        link,
        String(templateDefault)
      );
    }

    // Otherwise the v1 configuration default (already filled) is copied to v2. A
    // filled null (no default) matches the absent v2 key — nothing to write.
    const filled = effectiveCustomFields.find((cf) => cf.key === link.key);
    if (filled !== undefined && filled.value !== null && filled.value !== undefined) {
      applyV1ToV2(result, mergedExtendedFields, link, filled.value as LegacyFieldValue);
    }
    return pairedCustomFields;
  };

  for (const link of links.byKey.values()) {
    pairedCustomFields = pairLinkedField(link);
  }

  return finalizeResult(result, {
    baseExtendedFields: effectiveExtendedFields,
    mergedExtendedFields,
    baseCustomFields: effectiveCustomFields,
    pairedCustomFields,
  });
};

/**
 * Own-property lookup that distinguishes "the caller explicitly sent this
 * storage key" (even with an empty value) from "the key is absent".
 */
const readExplicitValue = (
  extendedFields: Record<string, unknown> | undefined,
  storageKey: string
): { explicit: true; value: string } | { explicit: false; value: undefined } => {
  if (extendedFields == null || !Object.prototype.hasOwnProperty.call(extendedFields, storageKey)) {
    return { explicit: false, value: undefined };
  }
  return { explicit: true, value: String(extendedFields[storageKey]) };
};

const initResult = (
  baseExtendedFields: Record<string, unknown> | null | undefined
): PairedFieldsResult => ({
  customFields: undefined,
  extendedFields: baseExtendedFields,
  conflictFields: [],
  invalidValues: [],
  malformedFields: [],
  unresolvedKeys: [],
  pairedKeyToStorageKey: {},
});

const collectUnlinked = (result: PairedFieldsResult, links: ActiveLinkMaps, key: string): void => {
  const malformed = links.malformedByKey.get(key);
  if (malformed !== undefined) {
    result.malformedFields.push(malformed);
  } else {
    result.unresolvedKeys.push(key);
  }
};

const applyV1ToV2 = (
  result: PairedFieldsResult,
  mergedExtendedFields: Record<string, unknown>,
  link: ActiveFieldLink,
  value: LegacyFieldValue
): void => {
  result.pairedKeyToStorageKey[link.key] = link.storageKey;
  if (value === null || value === undefined) {
    delete mergedExtendedFields[link.storageKey];
    return;
  }
  const encoded = encodeLegacyFieldValue(link.type, value);
  if (!encoded.ok) {
    result.invalidValues.push({ storageKey: link.storageKey, error: encoded.error });
    return;
  }
  mergedExtendedFields[link.storageKey] = encoded.value;
};

const applyV2ToV1 = (
  result: PairedFieldsResult,
  mergedExtendedFields: Record<string, unknown>,
  customFields: LegacyCaseCustomField[],
  link: ActiveFieldLink,
  storageValue: string
): LegacyCaseCustomField[] => {
  result.pairedKeyToStorageKey[link.key] = link.storageKey;
  if (storageValue === '') {
    // Explicit v2 clear: remove the key, write the canonical v1 empty value.
    delete mergedExtendedFields[link.storageKey];
    return upsertCustomFieldValue(customFields, link, null);
  }
  const decoded = decodeStorageFieldValue(link.type, storageValue);
  if (!decoded.ok) {
    result.invalidValues.push({ storageKey: link.storageKey, error: decoded.error });
    return customFields;
  }
  return upsertCustomFieldValue(customFields, link, decoded.value);
};

const finalizeResult = (
  result: PairedFieldsResult,
  {
    baseExtendedFields,
    mergedExtendedFields,
    baseCustomFields,
    pairedCustomFields,
  }: {
    baseExtendedFields: Record<string, unknown> | null | undefined;
    mergedExtendedFields: Record<string, unknown>;
    baseCustomFields: LegacyCaseCustomField[];
    pairedCustomFields: LegacyCaseCustomField[];
  }
): PairedFieldsResult => {
  const extendedFieldsUnchanged =
    baseExtendedFields != null &&
    isSameExtendedFieldsValue(baseExtendedFields, mergedExtendedFields);
  result.extendedFields = extendedFieldsUnchanged ? baseExtendedFields : mergedExtendedFields;
  // An empty merged map from an absent base is still "nothing changed".
  if (baseExtendedFields == null && Object.keys(mergedExtendedFields).length === 0) {
    result.extendedFields = baseExtendedFields;
  }

  if (pairedCustomFields !== baseCustomFields) {
    result.customFields = pairedCustomFields;
  }

  return result;
};

/**
 * Increments the paired-write usage counter when this request synchronized at
 * least one linked field and the pairing actually changed a representation.
 */
export const incrementPairedWriteCounter = (
  usageCounter: IUsageCounter | undefined,
  paired: PairedFieldsResult,
  changed: boolean
): void => {
  try {
    if (changed && Object.keys(paired.pairedKeyToStorageKey).length > 0) {
      usageCounter?.incrementCounter({ counterName: 'caseFieldsPairedWrite' });
    }
  } catch {
    // Telemetry must never mask the API response.
  }
};

/** Rejects the write with a structured `field_representations_conflict` 400. */
export const throwIfFieldRepresentationConflicts = (
  conflictFields: string[],
  usageCounter?: IUsageCounter
): void => {
  if (conflictFields.length === 0) {
    return;
  }
  try {
    usageCounter?.incrementCounter({ counterName: 'caseFieldsRepresentationsConflict' });
  } catch {
    // Telemetry must never mask the API response.
  }
  throw createTypedApiError({
    statusCode: 400,
    message:
      `The request supplies conflicting values for both representations of the linked ` +
      `field(s): ${conflictFields.map((name) => `"${name}"`).join(', ')}. Submit the value ` +
      `through customFields or extended_fields, or make both values equal.`,
    attributes: {
      code: CASES_API_ERROR_CODES.FIELD_REPRESENTATIONS_CONFLICT,
      fields: conflictFields,
    },
  });
};

/** Rejects the write when a linked value cannot round-trip through the codecs. */
export const throwIfInvalidLinkedFieldValues = (
  invalidValues: PairedFieldsResult['invalidValues']
): void => {
  if (invalidValues.length === 0) {
    return;
  }
  const detail = invalidValues
    .map(({ storageKey, error }) => `"${storageKey}": ${error}`)
    .join('; ');
  throw Boom.badRequest(`Invalid value(s) for linked case field(s) — ${detail}.`);
};
