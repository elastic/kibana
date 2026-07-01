/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldSnakeKey } from '../../../common/utils';
import { getV2FieldType } from './build_field_definition_yaml';

interface LegacyCaseCustomField {
  key: string;
  type: string;
  value: unknown;
}

/**
 * Computes the `extended_fields` entries to backfill onto an existing case from its legacy
 * `customFields`. A pre-v2 case stores its custom-field values in `customFields`; the v2 UI reads
 * the migrated global fields from `extended_fields`, so without this backfill those fields render
 * empty on existing cases.
 *
 * The storage key (`<key>_as_<type>`) is derived with the same `getV2FieldType` mapping the
 * field-definition migration uses, so the value lands under exactly the key the migrated field
 * definition renders.
 *
 * Only actual values are backfilled and existing keys are never overwritten:
 * - `null` / `undefined` custom-field values are skipped (the case left the field empty; the v2
 *   field then renders empty rather than being forced to a value).
 * - any key already present in `extended_fields` is left as-is (a value set in the v2 system wins).
 */
export const buildExtendedFieldsBackfill = (
  customFields: LegacyCaseCustomField[] | undefined,
  existingExtendedFields: Record<string, unknown> | null | undefined
): Record<string, string> => {
  const existing = existingExtendedFields ?? {};
  const additions: Record<string, string> = {};

  for (const cf of customFields ?? []) {
    const hasValue = cf.value !== null && cf.value !== undefined;
    if (hasValue) {
      const snakeKey = getFieldSnakeKey(cf.key, getV2FieldType(cf.type));
      if (!(snakeKey in existing)) {
        additions[snakeKey] = String(cf.value);
      }
    }
  }

  return additions;
};
