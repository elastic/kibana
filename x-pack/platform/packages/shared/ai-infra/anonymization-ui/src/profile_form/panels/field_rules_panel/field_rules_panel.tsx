/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { FieldRule } from '@kbn/anonymization-common';
import { FieldRulesPanelHeader } from './header';
import { FieldRulesPanelFilters } from './filters';
import { FieldRulesPanelBulkActions } from './bulk_actions';
import { FieldRulesPanelRows } from './rows';
import { FieldRulesPanelPagination } from './pagination';
import { FieldRulesPanelContextProvider } from './context';
import { useFieldRulesPanelState } from './hooks/use_field_rules_panel_state';

interface FieldRulesPanelProps {
  fieldRules: FieldRule[];
  onFieldRulesChange: (rules: FieldRule[]) => void;
  validationError?: string;
  selectedTargetName?: string;
  isManageMode: boolean;
  isSubmitting: boolean;
}

export const FieldRulesPanel = ({
  fieldRules,
  onFieldRulesChange,
  validationError,
  selectedTargetName,
  isManageMode,
  isSubmitting,
}: FieldRulesPanelProps) => {
  const state = useFieldRulesPanelState({ fieldRules, onFieldRulesChange });
  const value = {
    fieldSearchQuery: state.fieldSearchQuery,
    setFieldSearchQuery: state.setFieldSearchQuery,
    fieldActionFilter: state.fieldActionFilter,
    setFieldActionFilter: state.setFieldActionFilter,
    fieldPageIndex: state.fieldPageIndex,
    setFieldPageIndex: state.setFieldPageIndex,
    bulkAction: state.bulkAction,
    setBulkAction: state.setBulkAction,
    bulkEntityClass: state.bulkEntityClass,
    setBulkEntityClass: state.setBulkEntityClass,
    pagedRules: state.pagedRules,
    filteredRules: state.filteredRules,
    allRules: state.allRules,
    selectedFields: state.selectedFields,
    setSelectedFields: state.setSelectedFields,
    allFieldsSelected: state.allFieldsSelected,
    hasActiveFieldFilters: state.hasActiveFieldFilters,
    selectedCount: state.selectedCount,
    toggleSelectAllFields: state.toggleSelectAllFields,
    onRuleActionChange: state.onRuleActionChange,
    onRuleEntityClassChange: state.onRuleEntityClassChange,
    applyBulkAction: state.applyBulkAction,
    policyCounters: state.policyCounters,
    validationError,
    selectedTargetName,
    isManageMode,
    isSubmitting,
  };

  return (
    <FieldRulesPanelContextProvider value={value}>
      <FieldRulesPanelHeader />
      <FieldRulesPanelFilters />
      <FieldRulesPanelBulkActions />
      <EuiSpacer size="s" />
      <FieldRulesPanelRows />
      <EuiSpacer size="s" />
      <FieldRulesPanelPagination />
    </FieldRulesPanelContextProvider>
  );
};
