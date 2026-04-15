/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { FieldRule } from '@kbn/anonymization-common';
import type { FieldRuleAction } from '../../hooks/field_rule_actions';
import type { FIELD_ACTION_OPTIONS } from '../../constants';
import type { PolicyCounters } from './hooks/policy_helpers';

export interface FieldRulesPanelContextValue {
  fieldSearchQuery: string;
  setFieldSearchQuery: (value: string) => void;
  fieldActionFilter: (typeof FIELD_ACTION_OPTIONS)[number]['value'];
  setFieldActionFilter: (value: (typeof FIELD_ACTION_OPTIONS)[number]['value']) => void;
  fieldPageIndex: number;
  setFieldPageIndex: React.Dispatch<React.SetStateAction<number>>;
  bulkAction: FieldRuleAction;
  setBulkAction: (value: FieldRuleAction) => void;
  bulkEntityClass: string;
  setBulkEntityClass: (value: string) => void;
  pagedRules: FieldRule[];
  filteredRules: FieldRule[];
  allRules: FieldRule[];
  selectedFields: string[];
  setSelectedFields: (fields: string[]) => void;
  allFieldsSelected: boolean;
  hasActiveFieldFilters: boolean;
  selectedCount: number;
  toggleSelectAllFields: () => void;
  onRuleActionChange: (field: string, action: FieldRuleAction) => void;
  onRuleEntityClassChange: (field: string, entityClass: string) => void;
  applyBulkAction: () => void;
  policyCounters: PolicyCounters;
  validationError?: string;
  selectedTargetName?: string;
  isManageMode: boolean;
  isSubmitting: boolean;
}

const FieldRulesPanelContext = createContext<FieldRulesPanelContextValue | undefined>(undefined);

export const FieldRulesPanelContextProvider = ({
  value,
  children,
}: {
  value: FieldRulesPanelContextValue;
  children: React.ReactNode;
}) => <FieldRulesPanelContext.Provider value={value}>{children}</FieldRulesPanelContext.Provider>;

export const useFieldRulesPanelContext = (): FieldRulesPanelContextValue => {
  const context = useContext(FieldRulesPanelContext);
  if (context === undefined) {
    throw new Error('useFieldRulesPanelContext must be used within FieldRulesPanelContextProvider');
  }
  return context;
};
