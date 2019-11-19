/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiLoadingContent,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { columns, getColumns } from './columns';
import { useRules } from '../../../../containers/detection_engine/rules/use_rules';
import {
  FetchRulesResponse,
  PaginationOptions,
  Rule,
} from '../../../../containers/detection_engine/rules/types';
import { Loader } from '../../../../components/loader';
import { Panel } from '../../../../components/panel';
import { getBatchItems } from './batch_actions';
import { formatRules } from './helpers';

// TODO Move/Consolidate Types
export interface RuleTypes {
  href: string;
  name: string;
  status: string;
}

export interface LastResponseTypes {
  type: string;
  message?: string;
}

export interface ColumnTypes {
  rule_id: string;
  rule: RuleTypes;
  method: string;
  severity: string;
  lastCompletedRun: string | undefined;
  lastResponse: LastResponseTypes;
  tags: string[];
  activate: boolean;
  sourceRule: Rule;
  isLoading: boolean;
}

export interface SortTypes {
  field: string;
  direction: string;
}

// Reducer types
interface State {
  isLoading: boolean;
  rules: Rule[];
  pagination: PaginationOptions;
  refreshToggle: boolean;
  tableData: ColumnTypes[];
}

export type Action =
  | { type: 'refresh' }
  | { type: 'updateRules'; rules: Rule[]; pagination?: PaginationOptions }
  | { type: 'loading' }
  | { type: 'duplicate'; rule: Rule }
  | { type: 'deleteRules'; rules: Rule[] }
  | { type: 'updateLoading'; ruleIds: string[]; isLoading: boolean }
  | { type: 'failure' };

function allRulesReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'refresh': {
      console.log('allRulesReducer:refresh', state, action);
      return {
        ...state,
        refreshToggle: !state.refreshToggle,
      };
    }
    case 'updateRules': {
      console.log('allRulesReducer:updateRules', state, action);
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
        pagination: state.pagination,
      };
    }
    case 'deleteRules': {
      console.log('allRulesReducer:deleteRules', state, action);
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
    case 'updateLoading': {
      console.log('allRulesReducer:updateLoading', state, action);
      return {
        ...state,
        rules: state.rules,
        tableData: formatRules(state.rules, action.ruleIds),
      };
    }
    case 'loading': {
      return {
        ...state,
        isLoading: true,
      };
    }
    case 'failure': {
      return {
        ...state,
        isLoading: false,
        rules: [],
      };
    }
    default:
      return state;
  }
}

const initialState: State = {
  isLoading: false,
  refreshToggle: true,
  tableData: [],
  rules: [],
  pagination: {
    page: 1,
    perPage: 20,
    sortField: 'rule',
    total: 0,
  },
};

export const AllRules = React.memo(() => {
  const [{ refreshToggle, tableData, pagination }, dispatch] = useReducer(
    allRulesReducer,
    initialState
  );

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'rule', direction: 'asc' });
  const [isLoadingRules, rulesData, updatePagination] = useRules(refreshToggle);

  useEffect(() => {
    setIsLoading(isLoadingRules);

    if (!isLoadingRules) {
      setIsInitialLoad(false);
    }
  }, [isLoadingRules]);

  useEffect(() => {
    dispatch({
      type: 'updateRules',
      rules: rulesData.data,
      pagination: {
        sortField: initialState.pagination.sortField,
        page: rulesData.page,
        perPage: rulesData.perPage,
        total: rulesData.total,
      },
    });
  }, [rulesData]);

  console.log('Rendering All Rules');
  return (
    <>
      <EuiSpacer />

      <Panel loading={isLoading}>
        {isInitialLoad ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
        ) : (
          <>
            <HeaderSection split title="All rules">
              <EuiFieldSearch aria-label="Search rules" fullWidth placeholder="e.g. rule name" />
            </HeaderSection>

            <UtilityBar border>
              <UtilityBarSection>
                <UtilityBarGroup>
                  <UtilityBarText>{`Showing: ${pagination.total} rules`}</UtilityBarText>
                </UtilityBarGroup>

                <UtilityBarGroup>
                  <UtilityBarText>{`Selected: ${selectedState.length} rules`}</UtilityBarText>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={closePopover => (
                      <EuiContextMenuPanel
                        items={getBatchItems(selectedState, dispatch, closePopover)}
                      />
                    )}
                  >
                    {'Batch actions'}
                  </UtilityBarAction>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="refresh"
                    onClick={() => dispatch({ type: 'refresh' })}
                  >
                    {'Refresh'}
                  </UtilityBarAction>
                </UtilityBarGroup>

                {/* <UtilityBarGroup>*/}
                {/*  <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>*/}
                {/* </UtilityBarGroup>*/}
              </UtilityBarSection>
            </UtilityBar>

            <EuiBasicTable
              columns={getColumns(dispatch)}
              isSelectable
              itemId="rule_id"
              items={tableData}
              onChange={({
                page,
                sort,
              }: {
                page: {
                  index: number;
                  size: number;
                };
                sort: SortTypes;
              }) => {
                const sortField =
                  sort.field === 'rule' ? initialState.pagination.sortField : 'enabled';
                updatePagination({ page: page.index + 1, perPage: page.size, sortField });
                setSortState(sort);
              }}
              pagination={{
                pageIndex: pagination.page - 1,
                pageSize: pagination.perPage,
                totalItemCount: pagination.total,
                pageSizeOptions: [5, 10, 20],
              }}
              selection={{
                selectable: (item: ColumnTypes) => !item.isLoading,
                onSelectionChange: (selectedItems: ColumnTypes[]) => {
                  console.log('setSelectionChange');
                  console.log('selectecItems', selectedItems);
                  //
                  setSelectedState(selectedItems);
                },
              }}
              sorting={{
                sort: sortState,
              }}
            />
            {isLoading && <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />}
          </>
        )}
      </Panel>
    </>
  );
});
AllRules.displayName = 'AllRules';
