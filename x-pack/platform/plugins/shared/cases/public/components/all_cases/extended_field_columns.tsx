/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../common/ui/types';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { FieldType, isDisplayOnlyField } from '../../../common/types/domain/template/fields';
import {
  getFieldCamelKey,
  getFieldSnakeKey,
  parseFieldDefinitionsToInlineFields,
} from '../../../common/utils';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';
import { getEmptyCellValue } from '../empty_value';
import { TOGGLE_FIELD_ON_LABEL, TOGGLE_FIELD_OFF_LABEL } from '../custom_fields/translations';
import { AssigneesColumn } from './assignees_column';

/**
 * Fetches and parses the owner's global field definitions into inline fields.
 * Global (isGlobal) fields apply to every case, so they map 1:1 to columns; migrated
 * legacy custom fields also surface here (migration writes them as global fields).
 * The fetch is skipped (owner undefined) when `enabled` is false so the legacy
 * customFields path pays no extra request.
 *
 * Display-only fields (e.g. MARKDOWN) are excluded: they hold no per-case value (they're static
 * authored content on the template form, not case data — see `isDisplayOnlyField`), so they can
 * never render anything in a column/field cell. Offering one as a toggleable column/field would
 * just be an always-empty option that looks broken.
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
    () =>
      parseFieldDefinitionsToInlineFields(data?.fieldDefinitions ?? []).filter(
        (field) => !isDisplayOnlyField(field)
      ),
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
 * Parses a stored user-picker value into the `{ uid }` shape `AssigneesColumn` expects. Only the
 * uid is kept — like assignees, avatar rendering always prefers the live profile over the
 * point-in-time `name` snapshot stored alongside it. Exported so both the table and the
 * redesigned list (card) view can render user-picker fields as avatars identically.
 */
export const parseUserPickerAssignees = (raw: string): Array<{ uid: string }> | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const uids = parsed
      .map((item) => (item != null && typeof item === 'object' ? item.uid : undefined))
      .filter((uid): uid is string => typeof uid === 'string');
    return uids.length > 0 ? uids.map((uid) => ({ uid })) : null;
  } catch {
    return null;
  }
};

/**
 * Collects every uid referenced by a case's user-picker global-field values, so callers (the
 * all-cases list views) can aggregate uids across all rows into a single bulk profile fetch —
 * matching the existing `assignees` pattern — instead of fetching per row.
 */
export const getUserPickerUidsFromCase = (
  theCase: CaseUI,
  userPickerFields: readonly InlineField[]
): string[] => {
  const uids: string[] = [];
  for (const field of userPickerFields) {
    const rawValue = theCase.extendedFields?.[getFieldCamelKey(field.name, field.type)];
    if (rawValue) {
      const parsed = parseUserPickerAssignees(rawValue);
      if (parsed) {
        uids.push(...parsed.map(({ uid }) => uid));
      }
    }
  }
  return uids;
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

/**
 * Renders a user-picker global field as avatars (reusing `AssigneesColumn` — same overflow and
 * empty-state behavior as the assignees column) instead of the comma-joined name text used for
 * every other control type. `testSubjPrefix` keeps each user-picker column's test subjects unique
 * from the assignees column and from each other when multiple user-picker fields are shown.
 */
const UserPickerFieldCell: React.FC<{
  field: InlineField;
  theCase: CaseUI;
  userProfiles: Map<string, UserProfileWithAvatar>;
}> = ({ field, theCase, userProfiles }) => {
  const rawValue = theCase.extendedFields?.[getFieldCamelKey(field.name, field.type)];
  const assignees = useMemo(() => parseUserPickerAssignees(rawValue ?? '') ?? [], [rawValue]);

  return (
    <AssigneesColumn
      assignees={assignees}
      userProfiles={userProfiles}
      testSubjPrefix={`extendedField-${getExtendedFieldColumnKey(field)}`}
    />
  );
};

UserPickerFieldCell.displayName = 'UserPickerFieldCell';

/**
 * Builds the all-cases table column for a global field. Width is bounded (matching the legacy
 * text custom-field column) so a single extended-field column can't push the rest off-screen.
 * User-picker fields render avatars (via `userProfiles`, bulk-fetched once by the caller from all
 * rows' uids — see `getUserPickerUidsFromCase`); every other control type renders as text.
 */
export const getExtendedFieldTableColumn = (
  field: InlineField,
  userProfiles: Map<string, UserProfileWithAvatar>
): EuiBasicTableColumn<CaseUI> => ({
  name: field.label ?? field.name,
  maxWidth: '18em',
  minWidth: '6em',
  render: (theCase: CaseUI) =>
    field.control === FieldType.USER_PICKER ? (
      <UserPickerFieldCell field={field} theCase={theCase} userProfiles={userProfiles} />
    ) : (
      getExtendedFieldCellValue(field, theCase)
    ),
});
