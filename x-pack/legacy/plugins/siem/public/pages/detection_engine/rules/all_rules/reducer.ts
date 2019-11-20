/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FilterOptions,
  PaginationOptions,
  Rule,
} from '../../../../containers/detection_engine/rules/types';
import { TableData } from '../types';
import { formatRules } from './helpers';

export interface State {
  isLoading: boolean;
  rules: Rule[];
  selectedItems: TableData[];
  pagination: PaginationOptions;
  filterOptions: FilterOptions;
  refreshToggle: boolean;
  tableData: TableData[];
  exportPayload?: object[];
}

export type Action =
  | { type: 'refresh' }
  | { type: 'loading'; isLoading: boolean }
  | { type: 'deleteRules'; rules: Rule[] }
  | { type: 'duplicate'; rule: Rule }
  | { type: 'setExportPayload'; exportPayload?: object[] }
  | { type: 'setSelected'; selectedItems: TableData[] }
  | { type: 'updateLoading'; ids: string[]; isLoading: boolean }
  | { type: 'updateRules'; rules: Rule[]; pagination?: PaginationOptions }
  | { type: 'updatePagination'; pagination: PaginationOptions }
  | { type: 'updateFilterOptions'; filterOptions: FilterOptions }
  | { type: 'failure' };

export const allRulesReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'refresh': {
      return {
        ...state,
        refreshToggle: !state.refreshToggle,
      };
    }
    case 'updateRules': {
      if (action.pagination) {
        return {
          ...state,
          rules: action.rules,
          pagination: action.pagination,
          tableData: formatRules(action.rules),
        };
      }

      const ruleIds = state.rules.map(r => r.rule_id);
      const updatedRules = action.rules.reduce(
        (rules, updatedRule) =>
          ruleIds.includes(updatedRule.rule_id)
            ? rules.map(r => (updatedRule.rule_id === r.rule_id ? updatedRule : r))
            : [...rules, updatedRule],
        [...state.rules]
      );
      return {
        ...state,
        rules: updatedRules,
        tableData: formatRules(updatedRules),
      };
    }
    case 'updatePagination': {
      return {
        ...state,
        pagination: action.pagination,
      };
    }
    case 'updateFilterOptions': {
      return {
        ...state,
        filterOptions: action.filterOptions,
      };
    }
    case 'deleteRules': {
      const deletedRuleIds = action.rules.map(r => r.rule_id);
      const updatedRules = state.rules.reduce<Rule[]>(
        (rules, rule) => (deletedRuleIds.includes(rule.rule_id) ? rules : [...rules, rule]),
        []
      );
      return {
        ...state,
        rules: updatedRules,
        tableData: formatRules(updatedRules),
      };
    }
    case 'setSelected': {
      return {
        ...state,
        selectedItems: action.selectedItems,
      };
    }
    case 'updateLoading': {
      return {
        ...state,
        rules: state.rules,
        tableData: formatRules(state.rules, action.ids),
      };
    }
    case 'loading': {
      return {
        ...state,
        isLoading: action.isLoading,
      };
    }
    case 'failure': {
      return {
        ...state,
        isLoading: false,
        rules: [],
      };
    }
    case 'setExportPayload': {
      return {
        ...state,
        exportPayload: action.exportPayload,
      };
    }
    default:
      return state;
  }
};
