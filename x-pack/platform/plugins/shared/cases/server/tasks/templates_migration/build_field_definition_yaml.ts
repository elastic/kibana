/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as stringifyYaml } from 'yaml';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { FieldType } from '../../../common/types/domain/template/fields';

interface LegacyCustomField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

/**
 * Maps a legacy custom-field type to the v2 field-definition `type`. Shared with the case
 * extended-fields backfill so the storage key it computes (`<name>_as_<type>`) always matches the
 * type this migration writes into the field definition.
 * - number → `integer` (v1 numbers are integer-only; matches v2's own number fields)
 * - toggle → `boolean` (matches the native v2 TOGGLE field's `type`)
 * - text / unknown → `keyword`
 */
export const getV2FieldType = (legacyType: string): 'integer' | 'boolean' | 'keyword' => {
  if (legacyType === CustomFieldTypes.NUMBER) return 'integer';
  if (legacyType === CustomFieldTypes.TOGGLE) return 'boolean';
  return 'keyword';
};

/**
 * Strictly coerces a legacy toggle default to a boolean. Legacy toggle values are booleans in
 * practice, but the persisted config type allows `string | number | boolean`, so a truthy
 * `Boolean(value)` would wrongly map the string `'false'` to `true`. We therefore map only the
 * unambiguous boolean / `'true'` / `'false'` shapes and return `undefined` for anything else so the
 * caller omits the default rather than inventing one.
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
 * Builds a YAML string for a single FieldSchema entry from a legacy custom field configuration.
 * The returned `name` matches the legacy `key` so that per-case `customField.key` references
 * remain meaningful in the v2 system.
 */
export const buildFieldDefinitionYaml = (
  legacy: LegacyCustomField
): { name: string; yaml: string } => {
  const { key, label, type, required, defaultValue } = legacy;

  const fieldDef: Record<string, unknown> = {
    name: key,
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

  return { name: key, yaml: stringifyYaml(fieldDef, { lineWidth: 0 }) };
};
