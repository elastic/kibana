/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { CaseUI } from '../../../common/ui/types';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { FieldType } from '../../../common/types/domain/template/fields';
import {
  getFieldCamelKey,
  getFieldSnakeKey,
  parseFieldDefinitionsToInlineFields,
} from '../../../common/utils';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';
import { getEmptyCellValue } from '../empty_value';
import { TOGGLE_FIELD_ON_LABEL, TOGGLE_FIELD_OFF_LABEL } from '../custom_fields/translations';

/**
 * Fetches and parses the owner's global field definitions into inline fields.
 * Global (isGlobal) fields apply to every case, so they map 1:1 to columns; migrated
 * legacy custom fields also surface here (migration writes them as global fields).
 * The fetch is skipped (owner undefined) when `enabled` is false so the legacy
 * customFields path pays no extra request.
 */
export const useGlobalInlineFields = ({ enabled = true }: { enabled?: boolean } = {}): {
  globalInlineFields: InlineField[];
  isLoading: boolean;
} => {
  const { owner } = useCasesContext();
  const { data, isFetching } = useGetFieldDefinitions({
    owner: enabled ? owner : undefined,
    isGlobal: true,
    // Fetch once per session; a new array reference on refetch would churn the column memos.
    staleTime: Infinity,
  });

  const globalInlineFields = useMemo(
    () => parseFieldDefinitionsToInlineFields(data?.fieldDefinitions ?? []),
    [data]
  );

  return { globalInlineFields, isLoading: enabled && isFetching };
};

/**
 * Stable column/config identity for a global field (e.g. `priority_as_keyword`). Kept snake so the
 * `_as_<type>` suffix aliasing in mergeSelectedColumnsWithConfiguration survives a flag flip.
 */
export const getExtendedFieldColumnKey = (field: InlineField): string =>
  getFieldSnakeKey(field.name, field.type);

const parseJsonArray = (raw: string): string[] | null => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
};

// Selected users are persisted as JSON-stringified `{ uid, name }` objects (see SelectedUser in
// templates_v2/field_types/controls/user_picker/utils.ts). Parsing properly (rather than
// regex-matching the raw string) is required because a display name can itself contain a `"`
// (e.g. a nickname like `Robert "Bob" Smith`), which JSON.stringify escapes but a naive
// `"name":"([^"]*)"` regex would mis-split on.
const parseUserPickerNames = (raw: string): string[] | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const names = parsed
      .map((item) => (item != null && typeof item === 'object' ? item.name : undefined))
      .filter((name): name is string => typeof name === 'string');
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
};

/**
 * Coerces a stored `extended_fields` raw string value to a plain, human-readable display string
 * for the given control type. Shared by the all-cases table/list view (which wraps this in a
 * `<span>`) and the user-actions activity log (which interpolates it into an i18n message) —
 * both need identical parsing (toggle → On/Off, checkbox group/user picker → joined JSON values)
 * so a change to one doesn't silently drift from the other.
 */
export const getExtendedFieldDisplayValue = (control: string, rawValue: string): string => {
  if (control === FieldType.TOGGLE) {
    return rawValue === 'true' ? TOGGLE_FIELD_ON_LABEL : TOGGLE_FIELD_OFF_LABEL;
  }

  if (control === FieldType.CHECKBOX_GROUP) {
    const values = parseJsonArray(rawValue);
    return values ? values.join(', ') : rawValue;
  }

  if (control === FieldType.USER_PICKER) {
    const names = parseUserPickerNames(rawValue);
    return names ? names.join(', ') : rawValue;
  }

  return rawValue;
};

/**
 * Renders a case's stored `extended_fields` value for a global field column. Values are
 * persisted as strings; this coerces the common controls back to a readable cell.
 */
export const renderExtendedFieldValue = (
  field: InlineField,
  rawValue: string | undefined
): React.ReactNode => {
  if (rawValue == null || rawValue === '') {
    return getEmptyCellValue();
  }

  const dataTestSubj = `case-table-column-extendedField-${getExtendedFieldColumnKey(field)}`;

  return (
    <span data-test-subj={dataTestSubj}>
      {getExtendedFieldDisplayValue(field.control, rawValue)}
    </span>
  );
};

/**
 * Reads the extended-field value off a case for the given global field. `convertToCamelCase`
 * recurses into the `extended_fields` record, so its keys are camelCased on the client
 * (e.g. `priorityAsKeyword`) — look up with the camel key, not the snake storage key.
 */
export const getExtendedFieldCellValue = (field: InlineField, theCase: CaseUI): React.ReactNode =>
  renderExtendedFieldValue(
    field,
    theCase.extendedFields?.[getFieldCamelKey(field.name, field.type)]
  );
