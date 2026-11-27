/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InlineField } from '../../../../common/types/domain/template/fields';
import { isDisplayOnlyField } from '../../../../common/types/domain/template/fields';
import { evaluateCondition } from '../../../../common/types/domain/template/evaluate_conditions';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../../common/utils';
import { parseExtendedFieldKey } from '../../../../common/investigations/template_fields';
import type { CaseFieldError } from '../../../../common/investigations/template_fields';

/** Storage key (`<name>_as_<type>`) of a field. */
export const getFieldKey = (field: InlineField): string => getFieldSnakeKey(field.name, field.type);

/** Fields that hold a value (everything except display-only markdown). */
export const getValueFields = (fields: InlineField[]): InlineField[] =>
  fields.filter((field) => !isDisplayOnlyField(field));

/** Empty as Cases sees it: nothing, a blank string or an empty multi-value array. */
export const isEmptyFieldValue = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || value === '[]';

/**
 * Non-empty values as a snake-keyed string record for submission. Empty (`''`) and empty-array
 * (`'[]'`) values are dropped, so absent fields fall back to server defaults and required checks,
 * exactly as the Cases apply-template modal does.
 */
export const collectExtendedFieldValues = (
  rawValues: Record<string, unknown>
): Record<string, string> =>
  Object.entries(rawValues).reduce<Record<string, string>>((acc, [key, value]) => {
    if (!isEmptyFieldValue(value)) {
      acc[key] = String(value);
    }
    return acc;
  }, {});

/** Case `extended_fields` (snake keys) as the camelCase record `TemplateFieldsFormReady` reads. */
export const toCamelExtendedFields = (
  extendedFields: Record<string, string> | null | undefined
): Record<string, unknown> =>
  Object.entries(extendedFields ?? {}).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const parsed = parseExtendedFieldKey(key);
    acc[parsed ? getFieldCamelKey(parsed.name, parsed.type) : key] = value;
    return acc;
  }, {});

/** Whether `show_when` lets the field be seen with the given snake-keyed values. */
export const isFieldVisible = (
  field: InlineField,
  allFields: InlineField[],
  values: Record<string, unknown>
): boolean => {
  const showWhen = field.display?.show_when;
  if (!showWhen) {
    return true;
  }
  const fieldValues = Object.fromEntries(
    allFields.map((other) => [other.name, values[getFieldKey(other)]])
  );
  const fieldTypes = Object.fromEntries(allFields.map((other) => [other.name, other.type]));
  const fieldControls = Object.fromEntries(allFields.map((other) => [other.name, other.control]));
  return evaluateCondition(showWhen, fieldValues, fieldTypes, fieldControls);
};

/** The error text for a field the server refused, by the label Cases quotes ("Field "<label>" ..."). */
export interface FieldErrorTarget {
  key: string;
  message: string;
}

export interface SplitFieldErrors {
  targets: FieldErrorTarget[];
  /** Errors that name no field of the form, to be listed as plain text. */
  unmatched: string[];
}

/** Matches Cases' per-field messages to fields by label (`label ?? name`). */
export const splitFieldErrors = (
  errors: CaseFieldError[],
  fields: InlineField[]
): SplitFieldErrors => {
  const targets: FieldErrorTarget[] = [];
  const unmatched: string[] = [];
  const valueFields = getValueFields(fields);
  errors.forEach(({ label, message }) => {
    const field =
      label === null
        ? undefined
        : valueFields.find((candidate) => (candidate.label ?? candidate.name) === label);
    if (field) {
      targets.push({ key: getFieldKey(field), message });
    } else {
      unmatched.push(message);
    }
  });
  return { targets, unmatched };
};
