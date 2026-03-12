/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFieldRulesPanelContext } from './context';
import {
  FIELD_RULE_MASK_COLUMN_WIDTH,
  FIELD_RULE_POLICY_COLUMN_WIDTH,
  FIELD_RULE_SELECTION_COLUMN_WIDTH,
  FieldRulesPanelRowItem,
} from './row_item';

export const FieldRulesPanelRows = () => {
  const {
    pagedRules,
    selectedFields,
    setSelectedFields,
    allFieldsSelected,
    hasActiveFieldFilters,
    toggleSelectAllFields,
    validationError,
    onRuleActionChange,
    onRuleEntityClassChange,
    isManageMode,
    isSubmitting,
  } = useFieldRulesPanelContext();

  if (pagedRules.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('anonymizationUi.profiles.fieldRules.noMatchingFields', {
          defaultMessage: 'No fields match the current filters.',
        })}
      </EuiText>
    );
  }

  const selectedFieldSet = new Set(selectedFields);

  return (
    <>
      <EuiCheckbox
        id="anonymizationProfilesSelectAllFieldRules"
        checked={allFieldsSelected}
        onChange={toggleSelectAllFields}
        label={
          hasActiveFieldFilters
            ? i18n.translate('anonymizationUi.profiles.fieldRules.selectAllMatchingFields', {
                defaultMessage: 'Select all matching fields',
              })
            : i18n.translate('anonymizationUi.profiles.fieldRules.selectAllFields', {
                defaultMessage: 'Select all fields',
              })
        }
        disabled={!isManageMode || isSubmitting}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false} style={{ width: FIELD_RULE_SELECTION_COLUMN_WIDTH }} />
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiText size="xs">
            <EuiTextColor color="subdued">
              {i18n.translate('anonymizationUi.profiles.fieldRules.header.field', {
                defaultMessage: 'Field',
              })}
            </EuiTextColor>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: FIELD_RULE_POLICY_COLUMN_WIDTH }}>
          <EuiText size="xs">
            <EuiTextColor color="subdued">
              {i18n.translate('anonymizationUi.profiles.fieldRules.header.policy', {
                defaultMessage: 'Policy',
              })}
            </EuiTextColor>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: FIELD_RULE_MASK_COLUMN_WIDTH }}>
          <EuiText size="xs">
            <EuiTextColor color="subdued">
              {i18n.translate('anonymizationUi.profiles.fieldRules.header.mask', {
                defaultMessage: 'Entity class',
              })}
            </EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      {validationError ? (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={validationError}
            size="s"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}
      {pagedRules.map((rule) => {
        return (
          <div key={rule.field}>
            <FieldRulesPanelRowItem
              rule={rule}
              isSelected={selectedFieldSet.has(rule.field)}
              showValidationErrors={Boolean(validationError)}
              isManageMode={isManageMode}
              isSubmitting={isSubmitting}
              onToggleSelection={(field) => {
                if (selectedFieldSet.has(field)) {
                  setSelectedFields(
                    selectedFields.filter((selectedField) => selectedField !== field)
                  );
                  return;
                }

                setSelectedFields([...selectedFields, field]);
              }}
              onRuleActionChange={onRuleActionChange}
              onRuleEntityClassChange={onRuleEntityClassChange}
            />
            <EuiHorizontalRule margin="xs" />
          </div>
        );
      })}
    </>
  );
};
