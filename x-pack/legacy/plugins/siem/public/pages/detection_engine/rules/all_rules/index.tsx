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
import React, { useEffect, useReducer, useState } from 'react';

import uuid from 'uuid';
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
import { Loader } from '../../../../components/loader';
import { Panel } from '../../../../components/panel';
import { getBatchItems } from './batch_actions';
import { SortTypes, TableData } from '../types';
import { allRulesReducer, State } from './reducer';
import * as i18n from '../translations';
import { useKibanaUiSetting } from '../../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../../common/constants';
import { JSONDownloader } from '../components/json_downloader';
import { useStateToaster } from '../../../../components/toasters';

const initialState: State = {
  isLoading: true,
  refreshToggle: true,
  tableData: [],
  rules: [],
  selectedItems: [],
  pagination: {
    page: 1,
    perPage: 20,
    sortField: 'rule',
    total: 0,
  },
};

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Export
 */
export const AllRules = React.memo(() => {
  const [
    { exportPayload, isLoading, refreshToggle, selectedItems, tableData, pagination },
    dispatch,
  ] = useReducer(allRulesReducer, initialState);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'rule', direction: 'asc' });
  const [isLoadingRules, rulesData, updatePagination] = useRules(refreshToggle);
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  useEffect(() => {
    dispatch({ type: 'loading', isLoading: isLoadingRules });

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

  return (
    <>
      <JSONDownloader
        filename={`${i18n.EXPORT_FILENAME}.ndjson`}
        payload={exportPayload}
        onExportComplete={exportCount => {
          dispatchToaster({
            type: 'addToaster',
            toast: {
              id: uuid.v4(),
              title: i18n.SUCCESSFULLY_EXPORTED_RULES(exportCount),
              color: 'success',
              iconType: 'check',
            },
          });
        }}
      />
      <EuiSpacer />

      <Panel loading={isLoading}>
        {isInitialLoad ? (
          <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
        ) : (
          <>
            <HeaderSection split title={i18n.ALL_RULES}>
              <EuiFieldSearch
                aria-label={i18n.SEARCH_RULES}
                fullWidth
                placeholder={i18n.SEARCH_PLACEHOLDER}
              />
            </HeaderSection>

            <UtilityBar border>
              <UtilityBarSection>
                <UtilityBarGroup>
                  <UtilityBarText>{i18n.SHOWING_RULES(pagination.total ?? 0)}</UtilityBarText>
                </UtilityBarGroup>

                <UtilityBarGroup>
                  <UtilityBarText>{i18n.SELECTED_RULES(selectedItems.length)}</UtilityBarText>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="arrowDown"
                    popoverContent={closePopover => (
                      <EuiContextMenuPanel
                        items={getBatchItems(selectedItems, dispatch, closePopover, kbnVersion)}
                      />
                    )}
                  >
                    {i18n.BATCH_ACTIONS}
                  </UtilityBarAction>
                  <UtilityBarAction
                    iconSide="right"
                    iconType="refresh"
                    onClick={() => dispatch({ type: 'refresh' })}
                  >
                    {i18n.REFRESH}
                  </UtilityBarAction>
                </UtilityBarGroup>
              </UtilityBarSection>
            </UtilityBar>

            <EuiBasicTable
              columns={getColumns(dispatch, kbnVersion)}
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
                selectable: (item: TableData) => !item.isLoading,
                onSelectionChange: (selected: TableData[]) =>
                  dispatch({ type: 'setSelected', selectedItems: selected }),
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
