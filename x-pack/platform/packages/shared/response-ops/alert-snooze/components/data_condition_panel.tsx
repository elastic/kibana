/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import * as i18n from './translations';

export interface SelectOption {
  value: string;
  text: string;
}

export type DataConditionOperator = 'is' | 'is_not';

export type LogicalOperator = 'and' | 'or';

export interface DataConditionEntry {
  id: string;
  field: string;
  operator: DataConditionOperator;
  value: string;
  confirmed: boolean;
  /** Logical operator connecting this entry to the next one; ignored for the last entry. */
  logicalOperator: LogicalOperator;
}

const OPERATOR_OPTIONS: SelectOption[] = [
  { value: 'is', text: i18n.CONDITIONAL_OPERATOR('is') },
  { value: 'is_not', text: i18n.CONDITIONAL_OPERATOR('is_not') },
];

export interface DataConditionPanelProps {
  entry: DataConditionEntry;
  fieldOptions: SelectOption[];
  onChange: (newValue: DataConditionEntry | null) => void;
}

export const DataConditionPanel = ({ entry, fieldOptions, onChange }: DataConditionPanelProps) => {
  return (
    <EuiPanel
      hasBorder={!entry.confirmed}
      color={entry.confirmed ? 'subdued' : 'plain'}
      paddingSize="s"
      data-test-subj={`dataConditionPanel-${entry.id}`}
    >
      {entry.confirmed ? (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          data-test-subj={`dataConditionChip-${entry.id}`}
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="database" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiBadge color="neutral">{entry.field}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{i18n.CONDITIONAL_OPERATOR(entry.operator)}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="neutral">{entry.value}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="pencil"
              aria-label={i18n.EDIT_DATA_CONDITION_ARIA_LABEL}
              onClick={() => onChange({ ...entry, confirmed: false })}
              data-test-subj={`editDataCondition-${entry.id}`}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={i18n.REMOVE_DATA_CONDITION_ARIA_LABEL}
              onClick={() => onChange(null)}
              data-test-subj={`deleteDataCondition-${entry.id}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="database" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{i18n.DATA_CONDITION_LABEL}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="check"
                color="success"
                display="base"
                aria-label={i18n.CONFIRM_CONDITION_ARIA_LABEL}
                onClick={() => onChange({ ...entry, confirmed: true })}
                isDisabled={!entry.field || !entry.value}
                data-test-subj={`confirmDataCondition-${entry.id}`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                aria-label={i18n.REMOVE_DATA_CONDITION_ARIA_LABEL}
                onClick={() => onChange(null)}
                data-test-subj={`removeDataCondition-${entry.id}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiSelect
                options={fieldOptions}
                value={entry.field}
                onChange={(e) => onChange({ ...entry, field: e.target.value })}
                hasNoInitialSelection={!entry.field}
                aria-label={i18n.CONDITION_FIELD_ARIA_LABEL}
                data-test-subj={`dataConditionField-${entry.id}`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={OPERATOR_OPTIONS}
                value={entry.operator}
                onChange={(e) =>
                  onChange({ ...entry, operator: e.target.value as DataConditionOperator })
                }
                aria-label={i18n.CONDITION_OPERATOR_ARIA_LABEL}
                data-test-subj={`dataConditionOperator-${entry.id}`}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                value={entry.value}
                onChange={(e) => onChange({ ...entry, value: e.target.value })}
                placeholder={i18n.CONDITION_VALUE_PLACEHOLDER}
                aria-label={i18n.CONDITION_VALUE_ARIA_LABEL}
                data-test-subj={`dataConditionValue-${entry.id}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
