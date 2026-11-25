/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { EuiSearchBarProps, EuiTableComputedColumnType } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiInMemoryTable,
  EuiPageTemplate,
  EuiSearchBar,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import type { TransformFunction } from '../../../../../../common/constants';
import type { TransformId } from '../../../../../../common/types/transform';

import { type TransformListRow, TRANSFORM_LIST_COLUMN } from '../../../../common';
import { useRefreshTransformList } from '../../../../hooks';

import { CreateTransformButton } from '../create_transform_button';
import { RefreshTransformListButton } from '../refresh_transform_list_button';
import { useColumns } from './use_columns';
import { ExpandedRow } from './expanded_row';
import {
  filterTransforms,
  getTransformType,
  transformFilters,
} from './transform_search_bar_filters';
import { TransformStatsBar } from './transforms_stats_bar';
import { useTableSettings } from './use_table_settings';
import { TransformBulkActionsMenu } from './transform_bulk_actions_menu';
import { getCurrentPageTransforms } from './get_current_page_transforms';
import { StatsBarContainer } from '../stats_bar';
import { useAlertRuleFlyout } from '../../../../../alerting/transform_alerting_flyout';
import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';

type ItemIdToExpandedRowMap = Record<string, JSX.Element>;

const haveSameTransformIds = (
  firstItems: TransformListRow[],
  secondItems: TransformListRow[]
): boolean => {
  if (firstItems.length !== secondItems.length) {
    return false;
  }

  const secondItemIds = new Set(secondItems.map(({ id }) => id));
  return firstItems.every(({ id }) => secondItemIds.has(id));
};

function getItemIdToExpandedRowMap(
  itemIds: TransformId[],
  transforms: TransformListRow[],
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void,
  transformsStatsLoading: boolean
): ItemIdToExpandedRowMap {
  return itemIds.reduce((m: ItemIdToExpandedRowMap, transformId: TransformId) => {
    const item = transforms.find((transform) => transform.config.id === transformId);
    if (item !== undefined) {
      m[transformId] = <ExpandedRow item={item} onAlertEdit={onAlertEdit} />;
    }
    return m;
  }, {} as ItemIdToExpandedRowMap);
}

interface TransformListProps {
  isLoading: boolean;
  onCreateTransform: (transformFunction: TransformFunction) => void;
  pageState: ListingPageUrlState;
  transformNodes: number;
  transforms: TransformListRow[];
  transformsLoading: boolean;
  transformsStatsLoading: boolean;
  updatePageState: (update: Partial<ListingPageUrlState>) => void;
}

export const TransformList: FC<TransformListProps> = ({
  isLoading,
  onCreateTransform,
  pageState,
  transformNodes,
  transforms,
  transformsLoading,
  transformsStatsLoading,
  updatePageState,
}) => {
  const refreshTransformList = useRefreshTransformList();
  const { setEditAlertRule } = useAlertRuleFlyout();

  const searchQueryText = pageState.queryText ?? '';
  const setSearchQueryText = useCallback(
    (value: string) => {
      updatePageState({ queryText: value, pageIndex: 0 });
    },
    [updatePageState]
  );

  const [searchError, setSearchError] = useState<string | undefined>();
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<TransformId[]>([]);
  const [transformSelection, setTransformSelection] = useState<TransformListRow[]>([]);
  const transformSelectionRef = useRef<TransformListRow[]>([]);
  const updateTransformSelection = useCallback((selected: TransformListRow[]) => {
    transformSelectionRef.current = selected;
    setTransformSelection(selected);
  }, []);
  const selectionCheckboxId = useGeneratedHtmlId({ prefix: 'transformSelection' });
  const clearTransformSelection = useCallback((submittedItems: TransformListRow[]) => {
    if (!haveSameTransformIds(transformSelectionRef.current, submittedItems)) {
      return;
    }

    transformSelectionRef.current = [];
    setTransformSelection([]);
  }, []);

  const { sorting, pagination, onTableChange } = useTableSettings<TransformListRow>(
    TRANSFORM_LIST_COLUMN.ID,
    transforms,
    pageState,
    updatePageState
  );

  const { columns, modals: singleActionModals } = useColumns(
    expandedRowItemIds,
    setExpandedRowItemIds,
    transformNodes,
    transformSelection,
    transformsStatsLoading
  );

  const searchableTransforms = useMemo(
    () => transforms.map((transform) => ({ ...transform, type: getTransformType(transform) })),
    [transforms]
  );

  const filteredTransforms = useMemo(() => {
    const query = searchQueryText !== '' ? EuiSearchBar.Query.parse(searchQueryText) : undefined;
    const clauses = query?.ast?.clauses ?? [];
    return clauses.length > 0
      ? filterTransforms(searchableTransforms, clauses)
      : searchableTransforms;
  }, [searchQueryText, searchableTransforms]);

  useEffect(() => {
    const filteredTransformIds = new Set(filteredTransforms.map(({ id }) => id));
    const visibleSelection = transformSelectionRef.current.filter(({ id }) =>
      filteredTransformIds.has(id)
    );

    if (visibleSelection.length !== transformSelectionRef.current.length) {
      updateTransformSelection(visibleSelection);
    }
  }, [filteredTransforms, updateTransformSelection]);

  // EUI does not expose its computed page, so mirror it for cross-page selection controls.
  const currentPageTransforms = useMemo(
    () =>
      getCurrentPageTransforms({
        columns,
        pagination,
        sorting,
        transforms: filteredTransforms,
      }),
    [columns, filteredTransforms, pagination, sorting]
  );

  const selectedTransformIds = useMemo(
    () => new Set(transformSelection.map(({ id }) => id)),
    [transformSelection]
  );
  const isCurrentPageSelected =
    currentPageTransforms.length > 0 &&
    currentPageTransforms.every(({ id }) => selectedTransformIds.has(id));
  const isCurrentPagePartiallySelected =
    !isCurrentPageSelected && currentPageTransforms.some(({ id }) => selectedTransformIds.has(id));
  const areAllFilteredTransformsSelected =
    filteredTransforms.length > 0 &&
    filteredTransforms.every(({ id }) => selectedTransformIds.has(id));

  const toggleTransformSelection = useCallback(
    (item: TransformListRow, checked: boolean) => {
      const selected = checked
        ? [...transformSelectionRef.current.filter(({ id }) => id !== item.id), item]
        : transformSelectionRef.current.filter(({ id }) => id !== item.id);
      updateTransformSelection(selected);
    },
    [updateTransformSelection]
  );

  const toggleCurrentPageSelection = useCallback(
    (checked: boolean) => {
      const currentPageIds = new Set(currentPageTransforms.map(({ id }) => id));
      const selectedOutsideCurrentPage = transformSelectionRef.current.filter(
        ({ id }) => !currentPageIds.has(id)
      );
      updateTransformSelection(
        checked
          ? [...selectedOutsideCurrentPage, ...currentPageTransforms]
          : selectedOutsideCurrentPage
      );
    },
    [currentPageTransforms, updateTransformSelection]
  );

  const selectionColumn = useMemo<EuiTableComputedColumnType<TransformListRow>>(
    () => ({
      name: (
        <EuiCheckbox
          id={`${selectionCheckboxId}-all`}
          aria-label={i18n.translate('xpack.transform.transformList.selectCurrentPageLabel', {
            defaultMessage: 'Select all transforms on this page',
          })}
          checked={isCurrentPageSelected}
          indeterminate={isCurrentPagePartiallySelected}
          onChange={(event) => toggleCurrentPageSelection(event.target.checked)}
          data-test-subj="checkboxSelectAll"
        />
      ),
      width: '40px',
      render: (item: TransformListRow) => (
        <EuiCheckbox
          id={`${selectionCheckboxId}-${item.id}`}
          aria-label={i18n.translate('xpack.transform.transformList.selectTransformLabel', {
            defaultMessage: 'Select transform {transformId}',
            values: { transformId: item.id },
          })}
          checked={selectedTransformIds.has(item.id)}
          onChange={(event) => toggleTransformSelection(item, event.target.checked)}
          data-test-subj={`checkboxSelectRow-${item.id}`}
        />
      ),
    }),
    [
      isCurrentPagePartiallySelected,
      isCurrentPageSelected,
      selectedTransformIds,
      selectionCheckboxId,
      toggleCurrentPageSelection,
      toggleTransformSelection,
    ]
  );
  const tableColumns = useMemo(() => [selectionColumn, ...columns], [columns, selectionColumn]);

  if (transforms.length === 0) {
    return (
      <EuiPageTemplate.EmptyPrompt
        color={'subdued'}
        title={
          <h2>
            {i18n.translate('xpack.transform.list.emptyPromptTitle', {
              defaultMessage: 'No transforms found',
            })}
          </h2>
        }
        actions={[
          <CreateTransformButton
            label={i18n.translate('xpack.transform.list.emptyPromptButtonText', {
              defaultMessage: 'Create your first transform',
            })}
            onClick={onCreateTransform}
            transformNodes={transformNodes}
          />,
        ]}
        data-test-subj="transformNoTransformsFound"
      />
    );
  }

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(
    expandedRowItemIds,
    transforms,
    setEditAlertRule,
    transformsStatsLoading
  );

  const selectAllFilteredTransforms = () => {
    updateTransformSelection(filteredTransforms);
  };

  const clearAllTransformSelection = () => {
    updateTransformSelection([]);
  };

  const renderBulkActions = () => {
    return (
      <StatsBarContainer>
        <TransformBulkActionsMenu
          items={transformSelection}
          onProjectScopeUpdateSuccess={clearTransformSelection}
          transformNodes={transformNodes}
        />
        {isCurrentPageSelected &&
          filteredTransforms.length > currentPageTransforms.length &&
          !areAllFilteredTransformsSelected && (
            <EuiButtonEmpty
              size="s"
              iconType="documentsCheck"
              onClick={selectAllFilteredTransforms}
              data-test-subj="transformSelectAllButton"
            >
              {i18n.translate('xpack.transform.transformList.selectAllTransformsLabel', {
                defaultMessage:
                  'Select all {count} {count, plural, one {transform} other {transforms}}',
                values: { count: filteredTransforms.length },
              })}
            </EuiButtonEmpty>
          )}
        {areAllFilteredTransformsSelected && (
          <EuiButtonEmpty
            size="s"
            iconType="cross"
            onClick={clearAllTransformSelection}
            data-test-subj="transformClearSelectionButton"
          >
            {i18n.translate('xpack.transform.transformList.clearSelectionLabel', {
              defaultMessage: 'Clear selection',
            })}
          </EuiButtonEmpty>
        )}
      </StatsBarContainer>
    );
  };

  const toolsRight = (
    <RefreshTransformListButton onClick={refreshTransformList} isLoading={isLoading} />
  );

  const handleSearchOnChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
  };

  const search = {
    toolsRight,
    onChange: handleSearchOnChange,
    compressed: true,
    box: {
      compressed: true,
      incremental: true,
    },
    filters: transformFilters,
    query: searchQueryText,
  };

  return (
    <div data-test-subj="transformListTableContainer">
      {/* Single Action Modals */}
      {singleActionModals}

      <EuiInMemoryTable
        allowNeutralSort={false}
        className="transform__TransformTable"
        columns={tableColumns}
        childrenBetween={
          transformSelection.length > 0 ? (
            renderBulkActions()
          ) : (
            <TransformStatsBar
              pageIndex={pagination.pageIndex ?? 0}
              pageSize={pagination.pageSize ?? filteredTransforms.length}
              transformNodes={transformNodes}
              transformsList={filteredTransforms}
            />
          )
        }
        error={searchError}
        items={filteredTransforms}
        itemId={TRANSFORM_LIST_COLUMN.ID}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        loading={isLoading || transformsLoading}
        onTableChange={onTableChange}
        pagination={pagination}
        rowProps={(item) => ({
          'data-test-subj': `transformListRow row-${item.id}`,
        })}
        sorting={sorting}
        search={search}
        tableCaption={i18n.translate('xpack.transform.list.tableCaption', {
          defaultMessage: 'Transform list',
        })}
        data-test-subj={`transformListTable ${
          isLoading || transformsLoading ? 'loading' : 'loaded'
        }`}
      />
    </div>
  );
};
