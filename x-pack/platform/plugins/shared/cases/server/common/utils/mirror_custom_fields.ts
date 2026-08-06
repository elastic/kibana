/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import type { FieldLinkageMalformedErrorAttributes } from '../../../common/constants/error_codes';
import { createTypedApiError } from '../api_errors';
import type { FieldDefinitionsService } from '../../services';
import type { FieldLinkIndexes } from './field_link_resolution';
import { buildFieldLinkIndexes, resolveDefinitionForLegacyField } from './field_link_resolution';

/** Matches the persisted case customFields shape (`CasePersistedCustomFields`). */
interface LegacyCaseCustomField {
  key: string;
  type: string;
  value: unknown;
}

type MalformedField = FieldLinkageMalformedErrorAttributes['fields'][number];

export interface ResolvedMirrorResult {
  /**
   * Same-reference no-op semantics as `mergeCustomFieldsIntoExtendedFields`:
   * when nothing changes, this is the exact `existingExtendedFields` reference
   * so callers can skip the SO write / user action.
   */
  extendedFields: Record<string, string> | null | undefined;
  /**
   * Keys with no (or an ambiguous) linked definition — skipped, never mirrored
   * under a raw-key-derived storage key. Reported via `logUnresolvedMirrorKeys`.
   */
  unresolvedKeys: string[];
  /** Broken linkage — callers reject the write via `throwIfMalformedFieldLinkage`. */
  malformedFields: MalformedField[];
}

/**
 * Loads the owner's field definitions and builds the in-memory link indexes for
 * write-time mirroring. One bounded SO find per request (≤ definitions cap).
 */
export const loadFieldLinkIndexes = async (
  owner: string,
  fieldDefinitionsService: FieldDefinitionsService
): Promise<FieldLinkIndexes> => {
  const { fieldDefinitions } = await fieldDefinitionsService.getFieldDefinitions(owner);
  return buildFieldLinkIndexes(fieldDefinitions);
};

/**
 * Definition-resolved counterpart of `mergeCustomFieldsIntoExtendedFields`
 * (common/utils/template_fields.ts): every storage key is `${v1Key}_as_${type}`,
 * derived from the raw v1 custom-field key and the linked definition's parsed
 * YAML `type` — stable regardless of the definition's friendly `name`. Merge
 * semantics are unchanged (customFields-win; a null value
 * clears the mirror key), but:
 *
 * - a field with no or an ambiguous linked definition is skipped entirely
 *   (no add, no delete) and reported in `unresolvedKeys`;
 * - malformed linkage is collected in `malformedFields` for the caller to
 *   reject the write with a structured 400 (no partial guessing).
 *
 * The v1 value codecs (`String(value)`) intentionally stay identical to the
 * legacy helper — reversible codecs are PR-C scope.
 */
export const mergeCustomFieldsIntoExtendedFieldsResolved = (
  customFields: LegacyCaseCustomField[] | undefined,
  existingExtendedFields: Record<string, unknown> | null | undefined,
  indexes: FieldLinkIndexes
): ResolvedMirrorResult => {
  const existing = existingExtendedFields ?? {};
  const merged: Record<string, string> = { ...existing } as Record<string, string>;
  const unresolvedKeys: string[] = [];
  const malformedFields: MalformedField[] = [];

  for (const cf of customFields ?? []) {
    const resolution = resolveDefinitionForLegacyField(cf, indexes);

    if (resolution.status === 'malformed') {
      malformedFields.push({ key: cf.key, reason: resolution.reason });
    } else if (resolution.status === 'unresolved') {
      unresolvedKeys.push(cf.key);
    } else if (cf.value !== null && cf.value !== undefined) {
      merged[resolution.storageKey] = String(cf.value);
    } else {
      delete merged[resolution.storageKey];
    }
  }

  const existingKeys = Object.keys(existing);
  const mergedKeys = Object.keys(merged);
  const isNoOp =
    existingKeys.length === mergedKeys.length &&
    mergedKeys.every((k) => merged[k] === (existing as Record<string, string>)[k]);

  return {
    extendedFields: isNoOp
      ? (existingExtendedFields as Record<string, string> | null | undefined)
      : merged,
    unresolvedKeys,
    malformedFields,
  };
};

/** Rejects the case write with a structured `field_linkage_malformed` 400. */
export const throwIfMalformedFieldLinkage = (malformedFields: MalformedField[]): void => {
  if (malformedFields.length === 0) {
    return;
  }
  const detail = malformedFields.map(({ key, reason }) => `"${key}" (${reason})`).join('; ');
  throw createTypedApiError({
    statusCode: 400,
    message:
      `Cannot mirror custom fields into extended fields — the field-definition linkage is ` +
      `malformed for: ${detail}. Resolve the field library state and retry.`,
    attributes: {
      code: CASES_API_ERROR_CODES.FIELD_LINKAGE_MALFORMED,
      fields: malformedFields,
    },
  });
};

/**
 * Emits the skip diagnostic for unresolved keys. A warning (not an error): the
 * v1 value is still written; only the v2 mirror is deferred until the link
 * exists (the configure path creates it, the reconciliation phase backfills).
 */
export const logUnresolvedMirrorKeys = (
  unresolvedKeys: string[],
  { owner, logger }: { owner: string; logger: Logger }
): void => {
  if (unresolvedKeys.length === 0) {
    return;
  }
  logger.warn(
    `Skipped mirroring custom fields [${unresolvedKeys.join(', ')}] (owner: "${owner}") into ` +
      `extended_fields: no linked field definition resolved. Values remain readable through ` +
      `the v1 customFields API and will be reconciled once linked.`
  );
};
