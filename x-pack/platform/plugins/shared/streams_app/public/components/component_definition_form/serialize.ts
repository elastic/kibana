/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CatalogueArrayField,
  CatalogueChoiceGroup,
  CatalogueFieldDefinition,
  CatalogueMetadata,
  CatalogueNamedFieldDefinition,
  CatalogueSignal,
  StreamsUnit,
} from '@kbn/streams-schema';
import { resolveEnumOptions } from '../../services/component_catalogue';
import { findChoiceGroup, isUnselectedChoice } from './choice_groups';
import { isFieldAvailable, isFieldRequired } from './conditions';
import { isObjectValue, toFormValue, type FormValue, type ObjectValue } from './values';

type UnitComponent = NonNullable<StreamsUnit.Configuration['processors']>[number];
export type ConfigEntry = NonNullable<UnitComponent['config']>[number];

/** Array items carry this key when the array allows per-item telemetry. */
export const ITEM_TELEMETRY_KEY = 'telemetry';

/** Whether each item of an array may carry its own telemetry scope. */
export const allowsItemTelemetry = (field: CatalogueArrayField): boolean =>
  field.items.type === 'object' && field.items.telemetry_selection === 'configurable';

export interface FormContextValues {
  metadata: CatalogueMetadata;
  telemetry: readonly CatalogueSignal[];
}

/**
 * Splits component config entries into editable defaults and per-telemetry
 * overrides. Overrides are not editable in the form and are written back as-is.
 */
export const fromConfigEntries = (
  entries: readonly ConfigEntry[] | undefined
): { values: ObjectValue; scoped: ConfigEntry[] } => {
  const values: ObjectValue = {};
  const scoped: ConfigEntry[] = [];
  for (const entry of entries ?? []) {
    if (entry.telemetry !== undefined) {
      scoped.push(entry);
      continue;
    }
    const value = toFormValue(entry.value);
    if (value !== undefined) {
      values[entry.name] = value;
    }
  }
  return { values, scoped };
};

const canonicalObject = (
  fields: readonly CatalogueNamedFieldDefinition[],
  choiceGroups: readonly CatalogueChoiceGroup[] | undefined,
  value: ObjectValue,
  telemetry: readonly CatalogueSignal[],
  preservedKeys: readonly string[]
): ObjectValue => {
  const result: ObjectValue = {};
  const known = new Set(fields.map(({ name }) => name));
  for (const field of fields) {
    if (
      !isFieldAvailable(field, value, telemetry) ||
      isUnselectedChoice(choiceGroups, value, field.name)
    ) {
      continue;
    }
    const canonical = canonicalValue(field, value[field.name], telemetry);
    if (canonical !== undefined) {
      result[field.name] = canonical;
    }
  }
  for (const key of preservedKeys) {
    if (!known.has(key) && value[key] !== undefined) {
      result[key] = value[key];
    }
  }
  return result;
};

/** Normalises a raw form value into what is written to the unit, or `undefined` to omit it. */
export const canonicalValue = (
  field: CatalogueFieldDefinition,
  value: FormValue | undefined,
  telemetry: readonly CatalogueSignal[]
): FormValue | undefined => {
  if (value === undefined) {
    return undefined;
  }
  switch (field.type) {
    case 'string':
    case 'secret':
    case 'path':
    case 'enum':
    case 'literal':
      return value === '' ? undefined : value;
    case 'integer':
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    case 'component_reference':
      return value === '' || (Array.isArray(value) && value.length === 0) ? undefined : value;
    case 'object': {
      if (!isObjectValue(value)) {
        return undefined;
      }
      const extra = field.allow_additional_fields ? Object.keys(value) : [];
      const result = canonicalObject(field.fields, field.choice_groups, value, telemetry, extra);
      return Object.keys(result).length > 0 ? result : undefined;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        return undefined;
      }
      const items = value.flatMap((item) => {
        if (field.items.type === 'object' && isObjectValue(item)) {
          const extra = [
            ...(allowsItemTelemetry(field) ? [ITEM_TELEMETRY_KEY] : []),
            ...(field.items.allow_additional_fields ? Object.keys(item) : []),
          ];
          return [
            canonicalObject(field.items.fields, field.items.choice_groups, item, telemetry, extra),
          ];
        }
        const canonical = canonicalValue(field.items, item, telemetry);
        return canonical === undefined ? [] : [canonical];
      });
      return items.length > 0 ? items : undefined;
    }
    case 'map': {
      if (!isObjectValue(value)) {
        return undefined;
      }
      const result: ObjectValue = {};
      for (const [key, item] of Object.entries(value)) {
        const canonical = canonicalValue(field.value_schema, item, telemetry);
        if (key !== '' && canonical !== undefined) {
          result[key] = canonical;
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
    default:
      return value;
  }
};

/**
 * Writes form values back as config entries in definition order. Parameters the
 * definition does not know about (e.g. from hand-written YAML) are kept.
 */
export const toConfigEntries = (
  fields: readonly CatalogueNamedFieldDefinition[],
  values: ObjectValue,
  scoped: readonly ConfigEntry[],
  telemetry: readonly CatalogueSignal[]
): ConfigEntry[] => [
  ...Object.entries(canonicalObject(fields, undefined, values, telemetry, Object.keys(values))).map(
    ([name, value]) => ({ name, value })
  ),
  ...scoped,
];

const firstEnumOption = (
  field: CatalogueFieldDefinition,
  context: FormContextValues
): FormValue | undefined => {
  if (field.type !== 'enum') {
    return undefined;
  }
  return resolveEnumOptions(field, context.metadata, context.telemetry).find(
    (option) => !option.disabled
  )?.value;
};

const initialFieldValue = (
  field: CatalogueFieldDefinition,
  context: FormContextValues,
  preselect: boolean
): FormValue | undefined => {
  if (field.default !== undefined) {
    return field.default;
  }
  if (field.type === 'enum') {
    return preselect ? firstEnumOption(field, context) : undefined;
  }
  if (field.type === 'array' && field.required && (field.min_items ?? 0) > 0) {
    return Array.from({ length: field.min_items ?? 0 }, () =>
      createInitialItem(field.items, context)
    ).flatMap((item) => (item === undefined ? [] : [item]));
  }
  return undefined;
};

export const createInitialObject = (
  fields: readonly CatalogueNamedFieldDefinition[],
  choiceGroups: readonly CatalogueChoiceGroup[] | undefined,
  context: FormContextValues
): ObjectValue => {
  const result: ObjectValue = {};
  for (const field of fields) {
    if (isUnselectedChoice(choiceGroups, {}, field.name)) {
      continue;
    }
    const preselect =
      findChoiceGroup(choiceGroups, field.name) !== undefined ||
      isFieldRequired(field, result, context.telemetry);
    const value = initialFieldValue(field, context, preselect);
    if (value !== undefined) {
      result[field.name] = value;
    }
  }
  return result;
};

export const createInitialItem = (
  field: CatalogueFieldDefinition,
  context: FormContextValues
): FormValue | undefined =>
  field.type === 'object'
    ? createInitialObject(field.fields, field.choice_groups, context)
    : initialFieldValue(field, context, false);

/** A present-but-unfilled value, used when a choice group member is picked. */
export const createChoiceValue = (
  field: CatalogueFieldDefinition,
  context: FormContextValues
): FormValue => {
  const initial = initialFieldValue(field, context, true);
  if (initial !== undefined) {
    return initial;
  }
  switch (field.type) {
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return createInitialObject(field.fields, field.choice_groups, context);
    case 'map':
      return {};
    default:
      return '';
  }
};
