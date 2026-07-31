/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { getFieldRequirementLabel } from '../../optional_field_label';
import * as i18n from '../translations';

interface FieldValueViewProps {
  field: InlineField;
  value: unknown;
  isRequired: boolean;
  isRequiredOnClose: boolean;
  onEdit?: () => void;
}

const getSelectedValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string' || value === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const getUserNames = (value: unknown): string[] => {
  const parsedValue =
    typeof value === 'string' && value !== ''
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return undefined;
          }
        })()
      : value;

  return Array.isArray(parsedValue)
    ? parsedValue.flatMap((item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { name?: unknown }).name === 'string'
          ? [(item as { name: string }).name]
          : []
      )
    : [];
};

const getValueText = (field: InlineField, value: unknown): string => {
  if (field.control === FieldType.TOGGLE) {
    if (value === true || value === 'true') return i18n.TOGGLE_ON;
    if (value === false || value === 'false') return i18n.TOGGLE_OFF;
    return i18n.FIELD_VALUE_NOT_SET;
  }

  if (field.control === FieldType.CHECKBOX_GROUP) {
    const selectedValues = getSelectedValues(value);
    return selectedValues.length > 0 ? selectedValues.join(', ') : i18n.FIELD_VALUE_NOT_SET;
  }

  if (field.control === FieldType.USER_PICKER) {
    const userNames = getUserNames(value);
    return userNames.length > 0 ? userNames.join(', ') : i18n.FIELD_VALUE_NOT_SET;
  }

  if (value === undefined || value === null || value === '') {
    return i18n.FIELD_VALUE_NOT_SET;
  }

  return String(value);
};

export const FieldValueView: React.FC<FieldValueViewProps> = ({
  field,
  value,
  isRequired,
  isRequiredOnClose,
  onEdit,
}) => {
  const valueText = useMemo(() => getValueText(field, value), [field, value]);
  const isTextValue =
    field.control === FieldType.INPUT_TEXT || field.control === FieldType.TEXTAREA;

  return (
    <div data-test-subj={`template-field-value-${field.name}`}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{field.label ?? field.name}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {getFieldRequirementLabel(isRequired, isRequiredOnClose)}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {onEdit ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={onEdit}
              data-test-subj={`template-field-edit-${field.name}`}
            >
              {i18n.EDIT_FIELD}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiText
        size="s"
        data-test-subj={`template-field-value-text-${field.name}`}
        css={isTextValue ? css({ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }) : undefined}
      >
        <p>
          <EuiTextColor color={valueText === i18n.FIELD_VALUE_NOT_SET ? 'subdued' : 'default'}>
            {valueText}
          </EuiTextColor>
        </p>
      </EuiText>
    </div>
  );
};

FieldValueView.displayName = 'FieldValueView';
