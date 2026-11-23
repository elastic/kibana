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
import { FieldType } from '../../../common/types/domain/template/fields';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../common/utils';
import { getEmptyCellValue } from '../empty_value';
import { TOGGLE_FIELD_ON_LABEL, TOGGLE_FIELD_OFF_LABEL } from '../custom_fields/translations';
import { AssigneesColumn } from './assignees_column';

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
// Trailing comma on <T,> disambiguates the generic from JSX in a .tsx file.
const parseUserPickerField = <T,>(
  raw: string,
  extract: (item: Record<string, unknown>) => T | undefined
): T[] | null => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const values = parsed.reduce<T[]>((acc, item) => {
      if (item != null && typeof item === 'object') {
        const extracted = extract(item as Record<string, unknown>);
        if (extracted !== undefined) {
          acc.push(extracted);
        }
      }
      return acc;
    }, []);
    return values.length > 0 ? values : null;
  } catch {
    return null;
  }
};

const parseUserPickerNames = (raw: string): string[] | null =>
  parseUserPickerField(raw, (item) => (typeof item.name === 'string' ? item.name : undefined));

/**
 * Parses a stored user-picker value into the `{ uid }` shape `AssigneesColumn` expects. Only the
 * uid is kept — like assignees, avatar rendering always prefers the live profile over the
 * point-in-time `name` snapshot stored alongside it. Exported so both the table and the
 * redesigned list (card) view can render user-picker fields as avatars identically.
 */
export const parseUserPickerAssignees = (raw: string): Array<{ uid: string }> | null =>
  parseUserPickerField(raw, (item) =>
    typeof item.uid === 'string' ? { uid: item.uid } : undefined
  );

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

  // `eui-textTruncate` keeps long values inside the column's bounded width (see
  // getExtendedFieldTableColumn) so one field can't stretch the whole table.
  const dataTestSubj = `case-table-column-extendedField-${getExtendedFieldColumnKey(field)}`;

  return (
    <span className="eui-textTruncate" data-test-subj={dataTestSubj}>
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
  const assignees = useMemo(
    () => (rawValue ? parseUserPickerAssignees(rawValue) ?? [] : []),
    [rawValue]
  );

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
