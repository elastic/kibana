/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiSelect, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FIELD_ACTION_OPTIONS } from '../../constants';
import { useFieldRulesPanelContext } from './context';

export const FieldRulesPanelFilters = () => {
  const {
    fieldSearchQuery,
    setFieldSearchQuery,
    fieldActionFilter,
    setFieldActionFilter,
    setFieldPageIndex,
  } = useFieldRulesPanelContext();

  const onActionFilterChange = (value: string) => {
    const nextAction = FIELD_ACTION_OPTIONS.find((option) => option.value === value);
    setFieldActionFilter(nextAction?.value ?? 'all');
    setFieldPageIndex(0);
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldSearch
            value={fieldSearchQuery}
            aria-label={i18n.translate('anonymizationUi.profiles.fieldRules.searchAriaLabel', {
              defaultMessage: 'Search field rules',
            })}
            onChange={(event) => {
              setFieldSearchQuery(event.target.value);
              setFieldPageIndex(0);
            }}
            placeholder={i18n.translate('anonymizationUi.profiles.fieldRules.searchPlaceholder', {
              defaultMessage: 'Search fields',
            })}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            aria-label={i18n.translate(
              'anonymizationUi.profiles.fieldRules.actionFilterAriaLabel',
              {
                defaultMessage: 'Select field rule action filter',
              }
            )}
            value={fieldActionFilter}
            options={FIELD_ACTION_OPTIONS.map((option) => ({
              value: option.value,
              text: option.text,
            }))}
            onChange={(event) => onActionFilterChange(event.target.value)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
