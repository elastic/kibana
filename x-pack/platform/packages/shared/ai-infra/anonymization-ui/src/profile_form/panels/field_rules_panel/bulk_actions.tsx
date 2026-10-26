/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiText } from '@elastic/eui';
import { ANONYMIZATION_ENTITY_CLASSES } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { FIELD_RULE_ACTION_ANONYMIZE } from '../../hooks/field_rule_actions';
import { POLICY_ACTION_OPTIONS } from '../../constants';
import { useFieldRulesPanelContext } from './context';

export const FieldRulesPanelBulkActions = () => {
  const {
    selectedCount,
    bulkAction,
    setBulkAction,
    bulkEntityClass,
    setBulkEntityClass,
    applyBulkAction,
    isManageMode,
    isSubmitting,
  } = useFieldRulesPanelContext();

  const selectedCountLabel = i18n.translate(
    'anonymizationUi.profiles.fieldRules.bulk.selectedCount',
    {
      defaultMessage: '{count} selected',
      values: { count: selectedCount },
    }
  );
  const entityClassOptions = [
    {
      value: '',
      text: i18n.translate(
        'anonymizationUi.profiles.fieldRules.bulk.entityClassSelectPlaceholder',
        {
          defaultMessage: 'Select entity class',
        }
      ),
    },
    ...ANONYMIZATION_ENTITY_CLASSES.map((value) => ({ value, text: value })),
  ];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {selectedCountLabel}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          aria-label={i18n.translate('anonymizationUi.profiles.fieldRules.bulk.actionAriaLabel', {
            defaultMessage: 'Bulk policy action',
          })}
          value={bulkAction}
          onChange={(event) => {
            const selectedAction = event.target
              .value as (typeof POLICY_ACTION_OPTIONS)[number]['value'];
            setBulkAction(selectedAction);
          }}
          options={POLICY_ACTION_OPTIONS.map((option) => ({
            value: option.value,
            text: option.text,
          }))}
          disabled={!isManageMode || isSubmitting}
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          value={bulkEntityClass}
          aria-label={i18n.translate(
            'anonymizationUi.profiles.fieldRules.bulk.entityClassAriaLabel',
            {
              defaultMessage: 'Bulk entity class',
            }
          )}
          options={entityClassOptions}
          onChange={(event) => setBulkEntityClass(event.target.value)}
          disabled={bulkAction !== FIELD_RULE_ACTION_ANONYMIZE || !isManageMode || isSubmitting}
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={applyBulkAction}
          isDisabled={!isManageMode || isSubmitting || selectedCount === 0}
          size="s"
        >
          {i18n.translate('anonymizationUi.profiles.fieldRules.bulk.applyButton', {
            defaultMessage: 'Apply to selected',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
