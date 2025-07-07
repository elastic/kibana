/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiSearchBar } from '@elastic/eui';
import type {
  CriteriaWithPagination,
  EuiSearchBarOnChangeArgs,
  EuiSearchBarProps,
  EuiTableSortingType,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { getColumns } from './get_columns';
import { getRows } from './get_rows';
import { Toolbar } from './toolbar';
import { ContextEditorRow, FIELDS } from './types';
import { useAssistantContext } from '../../assistant_context';
import { ServerSidePagination } from '../../assistant/common/components/assistant_settings_management/pagination/use_session_pagination';
import type { UseSelectionReturn } from './selection/use_selection';
import type {
  HandlePageReset,
  HandleRowReset,
  OnListUpdated,
} from '../../assistant/settings/use_settings_updater/use_anonymization_updater';

const Wrapper = styled.div`
  > div > .euiSpacer {
    block-size: 16px;
  }
`;

export interface Props {
  anonymizationAllFields: FindAnonymizationFieldsResponse;
  anonymizationPageFields: FindAnonymizationFieldsResponse;
  compressed?: boolean;
  onListUpdated: OnListUpdated;
  rawData: Record<string, string[]> | null;
  onTableChange: (param: CriteriaWithPagination<ContextEditorRow>) => void;
  pagination: ServerSidePagination;
  sorting: EuiTableSortingType<ContextEditorRow>;
  search: EuiSearchBarProps;
  handleSearch: (query: EuiSearchBarOnChangeArgs) => void;
  handleRowReset: HandleRowReset;
  handlePageReset: HandlePageReset;
  selectionState: UseSelectionReturn['selectionState'];
  selectionActions: UseSelectionReturn['selectionActions'];
}

const ContextEditorComponent: React.FC<Props> = ({
  anonymizationAllFields,
  anonymizationPageFields,
  compressed = true,
  onListUpdated,
  rawData,
  onTableChange,
  pagination,
  sorting,
  search,
  handleSearch,
  handleRowReset,
  handlePageReset,
  selectionState,
  selectionActions,
}) => {
  const {
    assistantAvailability: { hasUpdateAIAssistantAnonymization },
  } = useAssistantContext();

  const tablePagination = useMemo(
    () => ({
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex,
      showPerPageOptions: true,
      totalItemCount: anonymizationPageFields.total,
    }),
    [anonymizationPageFields.total, pagination.pageIndex, pagination.pageSize]
  );

  const rows = useMemo(
    () =>
      getRows({
        anonymizationFields: anonymizationPageFields,
        rawData,
      }),
    [anonymizationPageFields, rawData]
  );

  const handleTableChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<ContextEditorRow>) => {
      onTableChange?.({ page, sort });
    },
    [onTableChange]
  );

  const { selectedFields, totalSelectedItems } = selectionState;
  const {
    handleSelectAll,
    handleUnselectAll,
    handlePageUnchecked,
    handlePageChecked,
    handleRowUnChecked,
    handleRowChecked,
  } = selectionActions;

  const columns = useMemo(
    () =>
      getColumns({
        compressed,
        handlePageChecked,
        handlePageUnchecked,
        handleRowChecked,
        handleRowUnChecked,
        hasUpdateAIAssistantAnonymization,
        onListUpdated,
        rawData,
        anonymizationPageFields: anonymizationPageFields.data || [],
        anonymizationAllFields: anonymizationAllFields.data || [],
        selectedFields,
        handleRowReset,
        handlePageReset,
        totalItemCount: anonymizationPageFields.total,
      }),
    [
      compressed,
      handlePageChecked,
      handlePageUnchecked,
      handleRowChecked,
      handleRowUnChecked,
      hasUpdateAIAssistantAnonymization,
      onListUpdated,
      rawData,
      anonymizationPageFields.data,
      anonymizationPageFields.total,
      anonymizationAllFields,
      selectedFields,
      handleRowReset,
      handlePageReset,
    ]
  );

  const toolbar = useMemo(
    () => (
      <Toolbar
        anonymizationAllFieldsData={anonymizationAllFields.data || []}
        onListUpdated={onListUpdated}
        onSelectAll={handleSelectAll}
        handleUnselectAll={handleUnselectAll}
        selected={selectedFields}
        totalFields={rawData == null ? anonymizationAllFields.total : totalSelectedItems}
        handleRowChecked={handleRowChecked}
      />
    ),
    [
      anonymizationAllFields,
      handleRowChecked,
      handleSelectAll,
      handleUnselectAll,
      onListUpdated,
      rawData,
      selectedFields,
      totalSelectedItems,
    ]
  );

  return (
    <Wrapper>
      <EuiSearchBar box={search.box} filters={search.filters} onChange={handleSearch} />
      {hasUpdateAIAssistantAnonymization ? toolbar : undefined}
      <EuiBasicTable
        columns={columns}
        compressed={compressed}
        data-test-subj="contextEditor"
        itemId={FIELDS.FIELD}
        items={rows}
        pagination={tablePagination}
        onChange={handleTableChange}
        sorting={sorting}
        css={css`
          min-height: 455px;
        `}
      />
    </Wrapper>
  );
};

ContextEditorComponent.displayName = 'ContextEditorComponent';
export const ContextEditor = React.memo(ContextEditorComponent);
