/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { ANONYMIZATION_ENTITY_CLASSES, type FieldRule } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { FIELD_RULE_ACTION_ANONYMIZE, type FieldRuleAction } from '../../hooks/field_rule_actions';
import { POLICY_ACTION_OPTIONS, toFieldAction } from '../../constants';
import { toActionOption } from './hooks/policy_helpers';

interface FieldRulesPanelRowItemProps {
  rule: FieldRule;
  isSelected: boolean;
  showValidationErrors: boolean;
  isManageMode: boolean;
  isSubmitting: boolean;
  onToggleSelection: (field: string) => void;
  onRuleActionChange: (field: string, action: FieldRuleAction) => void;
  onRuleEntityClassChange: (field: string, entityClass: string) => void;
}

export const FIELD_RULE_POLICY_COLUMN_WIDTH = 220;
export const FIELD_RULE_MASK_COLUMN_WIDTH = 180;
export const FIELD_RULE_SELECTION_COLUMN_WIDTH = 24;
const ENTITY_CLASS_OPTIONS = [
  {
    value: '',
    text: i18n.translate('anonymizationUi.profiles.fieldRules.rowEntityClassSelectPlaceholder', {
      defaultMessage: 'Select entity class',
    }),
  },
  ...ANONYMIZATION_ENTITY_CLASSES.map((value) => ({ value, text: value })),
];

export const FieldRulesPanelRowItem = ({
  rule,
  isSelected,
  showValidationErrors,
  isManageMode,
  isSubmitting,
  onToggleSelection,
  onRuleActionChange,
  onRuleEntityClassChange,
}: FieldRulesPanelRowItemProps) => {
  const [isEntityClassTouched, setIsEntityClassTouched] = useState(false);
  const action = toFieldAction(rule);
  const isEntityClassInvalid =
    action === FIELD_RULE_ACTION_ANONYMIZE &&
    !(rule.entityClass ?? '').trim() &&
    (isEntityClassTouched || showValidationErrors);
  const isRuleDisabled = !isManageMode || isSubmitting;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false} style={{ width: FIELD_RULE_SELECTION_COLUMN_WIDTH }}>
        <EuiCheckbox
          id={`fieldRuleSelect-${rule.field}`}
          aria-label={i18n.translate('anonymizationUi.profiles.fieldRules.selectFieldAriaLabel', {
            defaultMessage: 'Select field {field}',
            values: { field: rule.field },
          })}
          checked={isSelected}
          onChange={() => onToggleSelection(rule.field)}
          disabled={isRuleDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 0 }}>
        <EuiText size="s" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          <strong>{rule.field}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: FIELD_RULE_POLICY_COLUMN_WIDTH }}>
        <EuiButtonGroup
          legend={i18n.translate('anonymizationUi.profiles.fieldRules.rowPolicyLegend', {
            defaultMessage: 'Field policy',
          })}
          options={POLICY_ACTION_OPTIONS.map((option) => toActionOption(option.value, option.text))}
          idSelected={action}
          onChange={(value) => onRuleActionChange(rule.field, value as FieldRuleAction)}
          buttonSize="compressed"
          isDisabled={isRuleDisabled}
          type="single"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: FIELD_RULE_MASK_COLUMN_WIDTH }}>
        {action === FIELD_RULE_ACTION_ANONYMIZE ? (
          <EuiSelect
            compressed
            value={rule.entityClass ?? ''}
            aria-label={i18n.translate(
              'anonymizationUi.profiles.fieldRules.rowEntityClassAriaLabel',
              {
                defaultMessage: 'Entity class for field {field}',
                values: { field: rule.field },
              }
            )}
            options={ENTITY_CLASS_OPTIONS}
            onChange={(event) => onRuleEntityClassChange(rule.field, event.target.value)}
            onBlur={() => setIsEntityClassTouched(true)}
            isInvalid={isEntityClassInvalid}
            disabled={isRuleDisabled}
            data-test-subj={`anonymizationProfilesRuleEntityClass-${rule.field}`}
          />
        ) : (
          <EuiText size="xs">
            <EuiTextColor color="subdued">
              {i18n.translate('anonymizationUi.profiles.fieldRules.rowEntityClassNotUsed', {
                defaultMessage: 'Entity class not used',
              })}
            </EuiTextColor>
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
