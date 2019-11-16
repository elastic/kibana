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
import React, { useCallback, useEffect, useReducer, useState } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { getColumns } from './columns';
import { useRules } from '../../../../containers/detection_engine/rules/use_rules';
import { Rule } from '../../../../containers/detection_engine/rules/types';
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
  id: string;
  rule: RuleTypes;
  method: string;
  severity: string;
  lastCompletedRun: string;
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
  refreshToggle: boolean;
  tableData: ColumnTypes[];
}

type Action =
  | { type: 'refresh' }
  | { type: 'updateTableData'; rules?: Rule[]; selectedRules?: ColumnTypes[] }
  | { type: 'loading' }
  | { type: 'bulkDelete'; selectedRules: Rule[] }
  | { type: 'failure' };

function allRulesReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'refresh': {
      return {
        ...state,
        refreshToggle: !state.refreshToggle,
      };
    }
    case 'updateTableData': {
      return {
        ...state,
        tableData: formatRules(action.rules ?? []),
      };
    }
    case 'loading': {
      return {
        ...state,
        isLoading: true,
      };
    }
    case 'bulkDelete': {
      return {
        ...state,
        isLoading: false,
        rules: action.selectedRules,
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
};

export const AllRules = React.memo(() => {
  const [{ refreshToggle, tableData }, dispatch] = useReducer(allRulesReducer, initialState);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'rule', direction: 'asc' });
  const [isLoadingRules, rules, setRules, updatePagination] = useRules(refreshToggle);

  const updateRule = useCallback(
    (isEnabled: boolean, ruleId: string) => {
      const data = rules.data.map<Rule>(r => {
        return r.id === ruleId ? { ...r, enabled: isEnabled } : r;
      });
      setRules({ ...rules, data });
    },
    [rules]
  );

  useEffect(() => {
    setIsLoading(isLoadingRules);

    if (!isLoadingRules) {
      setIsInitialLoad(false);
    }
  }, [isLoadingRules]);

  useEffect(() => {
    dispatch({ type: 'updateTableData', rules: rules.data });
  }, [rules]);

  console.log('Rending AllRules Table');
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
                  <UtilityBarText>{`Showing: ${rules.total} rules`}</UtilityBarText>
                </UtilityBarGroup>

                <UtilityBarGroup>
                  <UtilityBarText>{`Selected: ${selectedState.length} rules`}</UtilityBarText>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={<EuiContextMenuPanel items={getBatchItems(selectedState)} />}
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
              columns={getColumns(updateRule)}
              isSelectable
              itemId="id"
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
                console.log('Updating sort/pagination');
                const sortField = sort.field === 'rule' ? 'name' : 'enabled';
                updatePagination({ page: page.index + 1, perPage: page.size, sortField });
                setSortState(sort);
              }}
              pagination={{
                pageIndex: rules.page - 1,
                pageSize: rules.perPage,
                totalItemCount: rules.total,
                pageSizeOptions: [5, 10, 20],
              }}
              selection={{
                selectable: () => true,
                onSelectionChange: (selectedItems: ColumnTypes[]) => {
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
