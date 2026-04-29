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
import { DataConditionType, type AlertSeverityLevel } from './types';

export interface SelectOption {
  value: string;
  text: string;
}

export type LogicalOperator = 'all' | 'any';

export interface DataConditionEntry {
  id: string;
  type: DataConditionType;
  field: string;
  value: AlertSeverityLevel;
  confirmed: boolean;
}

const TYPE_OPTIONS: SelectOption[] = [
  { value: DataConditionType.FIELD_CHANGE, text: i18n.CONDITION_TYPE_FIELD_CHANGE },
  { value: DataConditionType.SEVERITY_CHANGE, text: i18n.CONDITION_TYPE_SEVERITY_CHANGE },
  { value: DataConditionType.SEVERITY_EQUALS, text: i18n.CONDITION_TYPE_SEVERITY_EQUALS },
];

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: 'critical', text: i18n.SEVERITY_CRITICAL },
  { value: 'high', text: i18n.SEVERITY_HIGH },
  { value: 'medium', text: i18n.SEVERITY_MEDIUM },
  { value: 'low', text: i18n.SEVERITY_LOW },
  { value: 'info', text: i18n.SEVERITY_INFO },
];

const SEVERITY_COLORS: Record<AlertSeverityLevel, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'success',
  low: 'primary',
  info: 'default',
};

export interface DataConditionPanelProps {
  entry: DataConditionEntry;
  onChange: (newValue: DataConditionEntry | null) => void;
  /**
   * Types that should be hidden from the type dropdown (e.g. singleton types
   * like SEVERITY_CHANGE that already exist in another entry). The entry's own
   * current type is always kept visible so the user can still edit it.
   */
  disabledTypes?: readonly DataConditionType[];
}

export const DataConditionPanel = ({ entry, onChange, disabledTypes }: DataConditionPanelProps) => {
  const typeOptions = disabledTypes?.length
    ? TYPE_OPTIONS.filter((o) => o.value === entry.type || !disabledTypes.includes(o.value as DataConditionType))
    : TYPE_OPTIONS;
  const isComplete = () => {
    if (entry.type === DataConditionType.SEVERITY_CHANGE) return true;
    if (entry.type === DataConditionType.SEVERITY_EQUALS) return !!entry.value;
    if (entry.type === DataConditionType.FIELD_CHANGE) return !!entry.field;
    return false;
  };

  const getConfirmedText = () => {
    if (entry.type === DataConditionType.SEVERITY_CHANGE) {
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{i18n.CONDITION_TYPE_SEVERITY_CHANGE}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (entry.type === DataConditionType.SEVERITY_EQUALS) {
      const label = SEVERITY_OPTIONS.find((o) => o.value === entry.value)?.text || entry.value;
      const color = SEVERITY_COLORS[entry.value] || 'default';
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{i18n.CONDITION_TYPE_SEVERITY_EQUALS}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={color as any}>{label}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (entry.type === DataConditionType.FIELD_CHANGE) {
      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{i18n.CONDITION_TYPE_FIELD_CHANGE}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{entry.field}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    return null;
  };

  return (
    <EuiPanel
      hasBorder={true}
      color="plain"
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
          <EuiFlexItem>{getConfirmedText()}</EuiFlexItem>
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
                isDisabled={!isComplete()}
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
                options={typeOptions}
                value={entry.type}
                onChange={(e) =>
                  onChange({ ...entry, type: e.target.value as DataConditionType })
                }
                aria-label={i18n.CONDITION_FIELD_ARIA_LABEL}
                data-test-subj={`dataConditionType-${entry.id}`}
              />
            </EuiFlexItem>
            
            {entry.type === DataConditionType.SEVERITY_EQUALS && (
              <EuiFlexItem>
                <EuiSelect
                  options={SEVERITY_OPTIONS}
                  value={entry.value}
                  onChange={(e) =>
                    onChange({ ...entry, value: e.target.value as AlertSeverityLevel })
                  }
                  hasNoInitialSelection={!entry.value}
                  aria-label={i18n.CONDITION_VALUE_ARIA_LABEL}
                  data-test-subj={`dataConditionValue-${entry.id}`}
                />
              </EuiFlexItem>
            )}

            {entry.type === DataConditionType.FIELD_CHANGE && (
              <EuiFlexItem>
                <EuiFieldText
                  value={entry.field}
                  onChange={(e) => onChange({ ...entry, field: e.target.value })}
                  placeholder={i18n.CONDITION_VALUE_PLACEHOLDER}
                  aria-label={i18n.CONDITION_VALUE_ARIA_LABEL}
                  data-test-subj={`dataConditionField-${entry.id}`}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
