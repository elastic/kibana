/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FilterOptions,
  PaginationOptions,
  Rule,
} from '../../../../containers/detection_engine/rules';

type LoadingRuleAction = 'duplicate' | 'enable' | 'disable' | 'export' | 'delete' | null;
export interface State {
  exportRuleIds: string[];
  filterOptions: FilterOptions;
  loadingRuleIds: string[];
  loadingRulesAction: LoadingRuleAction;
  pagination: PaginationOptions;
  rules: Rule[] | null;
  selectedRuleIds: string[];
}

export type Action =
  | { type: 'exportRuleIds'; ids: string[] }
  | { type: 'loadingRuleIds'; ids: string[]; actionType: LoadingRuleAction }
  | { type: 'seletedRuleIds'; ids: string[] }
  | { type: 'setRules'; rules: Rule[] }
  | { type: 'updateRules'; rules: Rule[] }
  | { type: 'updatePagination'; pagination: Partial<PaginationOptions> }
  | {
      type: 'updateFilterOptions';
      filterOptions: Partial<FilterOptions>;
      pagination: Partial<PaginationOptions>;
    }
  | { type: 'failure' };

export const allRulesReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'exportRuleIds': {
      return {
        ...state,
        loadingRuleIds: action.ids,
        loadingRulesAction: 'export',
        exportRuleIds: action.ids,
      };
    }
    case 'loadingRuleIds': {
      return {
        ...state,
        loadingRuleIds: action.ids,
        loadingRulesAction: action.actionType,
      };
    }
    case 'seletedRuleIds': {
      return {
        ...state,
        selectedRuleIds: action.ids,
      };
    }
    case 'setRules': {
      return {
        ...state,
        rules: action.rules,
      };
    }
    case 'updateRules': {
      if (state.rules != null) {
        const ruleIds = state.rules.map(r => r.rule_id);
        const updatedRules = action.rules.reverse().reduce((rules, updatedRule) => {
          let newRules = rules;
          if (ruleIds.includes(updatedRule.rule_id)) {
            newRules = newRules.map(r => (updatedRule.rule_id === r.rule_id ? updatedRule : r));
          } else {
            newRules = [...newRules, updatedRule];
          }
          return newRules;
        }, state.rules);

        return {
          ...state,
          rules: updatedRules,
          selectedRuleIds: [],
          loadingRulesAction: null,
        };
      }
      return state;
    }
    case 'updatePagination': {
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.pagination,
        },
      };
    }
    case 'updateFilterOptions': {
      return {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.filterOptions,
        },
        pagination: {
          ...state.pagination,
          ...action.pagination,
        },
      };
    }
    case 'failure': {
      return {
        ...state,
        rules: [],
      };
    }
    default:
      return state;
  }
};
