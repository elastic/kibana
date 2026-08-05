/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CaseUI } from '../../../common/ui/types';
import type { InlineField } from '../../../common/types/domain/template/fields';
import { FieldType } from '../../../common/types/domain/template/fields';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../common/utils';
import { getEmptyCellValue } from '../empty_value';
import { TOGGLE_FIELD_ON_LABEL, TOGGLE_FIELD_OFF_LABEL } from '../custom_fields/translations';

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

  if (field.control === FieldType.TOGGLE) {
    return (
      <span className="eui-textTruncate" data-test-subj={dataTestSubj}>
        {rawValue === 'true' ? TOGGLE_FIELD_ON_LABEL : TOGGLE_FIELD_OFF_LABEL}
      </span>
    );
  }

  if (field.control === FieldType.CHECKBOX_GROUP) {
    const values = parseJsonArray(rawValue);
    return (
      <span className="eui-textTruncate" data-test-subj={dataTestSubj}>
        {values ? values.join(', ') : rawValue}
      </span>
    );
  }

  if (field.control === FieldType.USER_PICKER) {
    const names = [...rawValue.matchAll(/"name":"([^"]*)"/g)].map((match) => match[1]);
    return (
      <span className="eui-textTruncate" data-test-subj={dataTestSubj}>
        {names.length ? names.join(', ') : rawValue}
      </span>
    );
  }

  return (
    <span className="eui-textTruncate" data-test-subj={dataTestSubj}>
      {rawValue}
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
 * Builds the all-cases table column for a global field. Width is bounded (matching the legacy
 * text custom-field column) so a single extended-field column can't push the rest off-screen.
 */
export const getExtendedFieldTableColumn = (field: InlineField): EuiBasicTableColumn<CaseUI> => ({
  name: field.label ?? field.name,
  maxWidth: '18em',
  minWidth: '6em',
  render: (theCase: CaseUI) => getExtendedFieldCellValue(field, theCase),
});
