/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import {
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_MEDIUM,
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_INFO,
} from '@kbn/rule-data-utils';
import {
  DataConditionType,
  type AlertSeverityLevel,
  type DataConditionTypeDescriptor,
} from './types';
import { truncateMiddle } from '../utils/truncate';
import * as i18n from './translations';

// Per-severity i18n labels and badge colors.
const SEVERITY_LABELS: Record<AlertSeverityLevel, string> = {
  critical: i18n.SEVERITY_CRITICAL,
  high: i18n.SEVERITY_HIGH,
  medium: i18n.SEVERITY_MEDIUM,
  low: i18n.SEVERITY_LOW,
  info: i18n.SEVERITY_INFO,
};

// Mapped to EUI badge color tokens.
const SEVERITY_COLORS: Record<AlertSeverityLevel, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'success',
  low: 'primary',
  info: 'default',
};

const SEVERITY_DROPDOWN_VALUES: readonly AlertSeverityLevel[] = [
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_MEDIUM,
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_INFO,
];
const SEVERITY_OPTIONS = SEVERITY_DROPDOWN_VALUES.map((value) => ({
  value,
  text: SEVERITY_LABELS[value],
}));

/**
 * Built-in descriptor: matches when an alert's value for a user-supplied
 * field changes from one ingest to the next. Always available and not a
 * singleton — users can stack several `field_change` rows for different
 * fields.
 */
export const fieldChangeDescriptor: DataConditionTypeDescriptor = {
  id: DataConditionType.FIELD_CHANGE,
  label: i18n.CONDITION_TYPE_FIELD_CHANGE,
  isComplete: (entry) => !!entry.field,
  renderInput: (entry, onChange) => (
    <EuiFieldText
      value={entry.field}
      onChange={(e) => onChange({ ...entry, field: e.target.value })}
      placeholder={i18n.FIELD_NAME_PLACEHOLDER}
      aria-label={i18n.CONDITION_VALUE_ARIA_LABEL}
      data-test-subj={`dataConditionField-${entry.id}`}
      compressed
    />
  ),
  renderConfirmedSummary: (entry) => (
    <EuiBadge color="hollow" title={entry.field}>
      {truncateMiddle(entry.field)}
    </EuiBadge>
  ),
  getPreviewText: (entry) => i18n.getPreviewFieldChange(truncateMiddle(entry.field)),
  serialize: (entry) => ({
    type: DataConditionType.FIELD_CHANGE,
    field: entry.field,
  }),
};

/**
 * Built-in descriptor: matches when an alert's severity changes (any
 * direction). It's marked as a singleton because adding the same row twice
 * makes no semantic difference; the dropdown hides it for new rows once
 * one exists.
 */
export const severityChangeDescriptor: DataConditionTypeDescriptor = {
  id: DataConditionType.SEVERITY_CHANGE,
  label: i18n.CONDITION_TYPE_SEVERITY_CHANGE,
  isSingleton: true,
  isComplete: () => true,
  renderInput: () => null,
  renderConfirmedSummary: () => null,
  getPreviewText: () => i18n.PREVIEW_SEVERITY_CHANGE,
  serialize: () => ({ type: DataConditionType.SEVERITY_CHANGE }),
};

/**
 * Built-in descriptor: matches when the alert severity equals a chosen
 * level. Multiple instances are allowed (e.g. `severity equals critical OR
 * severity equals high` is a valid configuration), but with the `ALL`
 * operator two distinct severities can never both be true at once — the
 * descriptor surfaces that via `getWarning`.
 */
export const severityEqualsDescriptor: DataConditionTypeDescriptor = {
  id: DataConditionType.SEVERITY_EQUALS,
  label: i18n.CONDITION_TYPE_SEVERITY_EQUALS,
  isComplete: (entry) => !!entry.value,
  renderInput: (entry, onChange) => (
    <EuiSelect
      options={SEVERITY_OPTIONS}
      value={entry.value}
      onChange={(e) => onChange({ ...entry, value: e.target.value as AlertSeverityLevel })}
      hasNoInitialSelection={!entry.value}
      aria-label={i18n.CONDITION_VALUE_ARIA_LABEL}
      data-test-subj={`dataConditionValue-${entry.id}`}
      compressed
    />
  ),
  renderConfirmedSummary: (entry) => {
    const label = SEVERITY_OPTIONS.find((o) => o.value === entry.value)?.text ?? entry.value;
    const color = SEVERITY_COLORS[entry.value] ?? 'default';
    return (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={color}>{label}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  },
  getPreviewText: (entry) => i18n.getPreviewSeverityEquals(entry.value),
  serialize: (entry) => ({
    type: DataConditionType.SEVERITY_EQUALS,
    value: entry.value,
  }),
  getWarning: ({ confirmedEntries, conditionOperator }) => {
    if (conditionOperator !== 'all') return null;
    const distinctValues = new Set(
      confirmedEntries
        .filter((c) => c.type === DataConditionType.SEVERITY_EQUALS)
        .map((c) => c.value)
    );
    return distinctValues.size > 1 ? i18n.CONFLICTING_SEVERITY_EQUALS_WARNING : null;
  },
};

/**
 * Default descriptor list shipped with the package.
 */
export const DEFAULT_DATA_CONDITION_TYPES: readonly DataConditionTypeDescriptor[] = [
  fieldChangeDescriptor,
  severityChangeDescriptor,
  severityEqualsDescriptor,
];
