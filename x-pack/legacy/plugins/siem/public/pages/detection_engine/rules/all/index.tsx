/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiLoadingContent,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useHistory } from 'react-router-dom';
import uuid from 'uuid';

import {
  useRules,
  CreatePreBuiltRules,
  FilterOptions,
} from '../../../../containers/detection_engine/rules';
import { HeaderSection } from '../../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../components/detection_engine/utility_bar';
import { useStateToaster } from '../../../../components/toasters';
import { Loader } from '../../../../components/loader';
import { Panel } from '../../../../components/panel';
import { PrePackagedRulesPrompt } from '../components/pre_packaged_rules/load_empty_prompt';
import { RuleDownloader } from '../components/rule_downloader';
import { getPrePackagedRuleStatus } from '../helpers';
import * as i18n from '../translations';
import { EuiBasicTableOnChange, TableData } from '../types';
import { getBatchItems } from './batch_actions';
import { getColumns } from './columns';
import { showRulesTable } from './helpers';
import { allRulesReducer, State } from './reducer';
import { RulesTableFilters } from './rules_table_filters/rules_table_filters';

const initialState: State = {
  isLoading: true,
  rules: [],
  tableData: [],
  selectedItems: [],
  refreshToggle: true,
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions: {
    filter: '',
    sortField: 'enabled',
    sortOrder: 'desc',
  },
};

interface AllRulesProps {
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasNoPermissions: boolean;
  importCompleteToggle: boolean;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: () => void;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
  setRefreshRulesData: (refreshRule: () => void) => void;
}

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export const AllRules = React.memo<AllRulesProps>(
  ({
    createPrePackagedRules,
    hasNoPermissions,
    importCompleteToggle,
    loading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    setRefreshRulesData,
  }) => {
    const [
      {
        exportPayload,
        filterOptions,
        isLoading,
        refreshToggle,
        selectedItems,
        tableData,
        pagination,
      },
      dispatch,
    ] = useReducer(allRulesReducer, initialState);
    const history = useHistory();
    const [oldRefreshToggle, setOldRefreshToggle] = useState(refreshToggle);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isGlobalLoading, setIsGlobalLoad] = useState(false);
    const [, dispatchToaster] = useStateToaster();
    const [isLoadingRules, rulesData, reFetchRulesData] = useRules(pagination, filterOptions);

    const prePackagedRuleStatus = getPrePackagedRuleStatus(
      rulesInstalled,
      rulesNotInstalled,
      rulesNotUpdated
    );

    const getBatchItemsPopoverContent = useCallback(
      (closePopover: () => void) => (
        <EuiContextMenuPanel
          items={getBatchItems(selectedItems, dispatch, dispatchToaster, history, closePopover)}
        />
      ),
      [selectedItems, dispatch, dispatchToaster, history]
    );

    const tableOnChangeCallback = useCallback(
      ({ page, sort }: EuiBasicTableOnChange) => {
        dispatch({
          type: 'updateFilterOptions',
          filterOptions: {
            sortField: 'enabled', // Only enabled is supported for sorting currently
            sortOrder: sort?.direction ?? 'desc',
          },
          pagination: { page: page.index + 1, perPage: page.size },
        });
      },
      [dispatch]
    );

    const columns = useMemo(() => {
      return getColumns(dispatch, dispatchToaster, history, hasNoPermissions);
    }, [dispatch, dispatchToaster, history]);

    useEffect(() => {
      dispatch({ type: 'loading', isLoading: isLoadingRules });
    }, [isLoadingRules]);

    useEffect(() => {
      if (!isLoadingRules && !loading && isInitialLoad) {
        setIsInitialLoad(false);
      }
    }, [isInitialLoad, isLoadingRules, loading]);

    useEffect(() => {
      if (!isGlobalLoading && (isLoadingRules || isLoading)) {
        setIsGlobalLoad(true);
      } else if (isGlobalLoading && !isLoadingRules && !isLoading) {
        setIsGlobalLoad(false);
      }
    }, [setIsGlobalLoad, isGlobalLoading, isLoadingRules, isLoading]);

    useEffect(() => {
      if (!isInitialLoad) {
        dispatch({ type: 'refresh' });
      }
    }, [importCompleteToggle]);

    useEffect(() => {
      if (!isInitialLoad && reFetchRulesData != null && oldRefreshToggle !== refreshToggle) {
        setOldRefreshToggle(refreshToggle);
        reFetchRulesData();
        refetchPrePackagedRulesStatus();
      }
    }, [
      isInitialLoad,
      refreshToggle,
      oldRefreshToggle,
      reFetchRulesData,
      refetchPrePackagedRulesStatus,
    ]);

    useEffect(() => {
      if (reFetchRulesData != null) {
        setRefreshRulesData(reFetchRulesData);
      }
    }, [reFetchRulesData, setRefreshRulesData]);

    useEffect(() => {
      dispatch({
        type: 'updateRules',
        rules: rulesData.data,
        pagination: {
          page: rulesData.page,
          perPage: rulesData.perPage,
          total: rulesData.total,
        },
      });
    }, [rulesData]);

    const handleCreatePrePackagedRules = useCallback(async () => {
      if (createPrePackagedRules != null) {
        await createPrePackagedRules();
        dispatch({ type: 'refresh' });
      }
    }, [createPrePackagedRules]);

    const euiBasicTableSelectionProps = useMemo(
      () => ({
        selectable: (item: TableData) => !item.isLoading,
        onSelectionChange: (selected: TableData[]) =>
          dispatch({ type: 'setSelected', selectedItems: selected }),
      }),
      []
    );

    const onFilterChangedCallback = useCallback((newFilterOptions: Partial<FilterOptions>) => {
      dispatch({
        type: 'updateFilterOptions',
        filterOptions: {
          ...newFilterOptions,
        },
        pagination: { page: 1 },
      });
    }, []);

    const emptyPrompt = useMemo(() => {
      return (
        <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
      );
    }, []);

    return (
      <>
        <RuleDownloader
          filename={`${i18n.EXPORT_FILENAME}.ndjson`}
          rules={exportPayload}
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

        <Panel loading={isGlobalLoading}>
          <>
            {((rulesCustomInstalled && rulesCustomInstalled > 0) ||
              (rulesInstalled != null && rulesInstalled > 0)) && (
              <HeaderSection split title={i18n.ALL_RULES}>
                <RulesTableFilters
                  onFilterChanged={onFilterChangedCallback}
                  rulesCustomInstalled={rulesCustomInstalled}
                  rulesInstalled={rulesInstalled}
                />
              </HeaderSection>
            )}
            {isInitialLoad && (
              <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
            )}
            {isGlobalLoading && !isEmpty(tableData) && !isInitialLoad && (
              <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
            )}
            {rulesCustomInstalled != null &&
              rulesCustomInstalled === 0 &&
              prePackagedRuleStatus === 'ruleNotInstalled' && (
                <PrePackagedRulesPrompt
                  createPrePackagedRules={handleCreatePrePackagedRules}
                  loading={loadingCreatePrePackagedRules}
                  userHasNoPermissions={hasNoPermissions}
                />
              )}
            {showRulesTable({ isInitialLoad, rulesCustomInstalled, rulesInstalled }) && (
              <>
                <UtilityBar border>
                  <UtilityBarSection>
                    <UtilityBarGroup>
                      <UtilityBarText>{i18n.SHOWING_RULES(pagination.total ?? 0)}</UtilityBarText>
                    </UtilityBarGroup>

                    <UtilityBarGroup>
                      <UtilityBarText>{i18n.SELECTED_RULES(selectedItems.length)}</UtilityBarText>
                      {!hasNoPermissions && (
                        <UtilityBarAction
                          iconSide="right"
                          iconType="arrowDown"
                          popoverContent={getBatchItemsPopoverContent}
                        >
                          {i18n.BATCH_ACTIONS}
                        </UtilityBarAction>
                      )}
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
                  columns={columns}
                  isSelectable={!hasNoPermissions ?? false}
                  itemId="id"
                  items={tableData}
                  noItemsMessage={emptyPrompt}
                  onChange={tableOnChangeCallback}
                  pagination={{
                    pageIndex: pagination.page - 1,
                    pageSize: pagination.perPage,
                    totalItemCount: pagination.total,
                    pageSizeOptions: [5, 10, 20, 50, 100, 200, 300],
                  }}
                  sorting={{ sort: { field: 'activate', direction: filterOptions.sortOrder } }}
                  selection={hasNoPermissions ? undefined : euiBasicTableSelectionProps}
                />
              </>
            )}
          </>
        </Panel>
      </>
    );
  }
);

AllRules.displayName = 'AllRules';
