import React from 'react';
import PropTypes from 'prop-types';

import { KuiListingTableToolbar } from './listing_table_toolbar';
import { KuiListingTableToolbarFooter } from './listing_table_toolbar_footer';
import { KuiListingTableRow } from './listing_table_row';

import {
  KuiControlledTable,
  KuiTableHeaderCheckBoxCell,
  KuiTableBody,
  KuiTableHeader,
  KuiTable,
  KuiEmptyTablePromptPanel,
  KuiTableInfo,
} from '../../index';

export function KuiListingTable({
  rows,
  columns,
  pager,
  toolbarActions,
  onFilter,
  onItemSelectionChanged,
  selectedRowIds,
  filter,
  loading,
  noItemsPrompt,
}) {

  function areAllRowsChecked() {
    return rows.length === selectedRowIds.length;
  }

  function toggleAll() {
    if (areAllRowsChecked()) {
      onItemSelectionChanged([]);
    } else {
      onItemSelectionChanged(rows.map(row => row.id));
    }
  }

  function toggleRow(rowId) {
    const selectedRowIndex = selectedRowIds.indexOf(rowId);
    if (selectedRowIndex >= 0) {
      onItemSelectionChanged(selectedRowIds.filter((item, index) => index !== selectedRowIndex));
    } else {
      onItemSelectionChanged([
        ...selectedRowIds,
        rowId
      ]);
    }
  }

  function renderTableRows() {
    return rows.map((row, rowIndex) => {
      return (
        <KuiListingTableRow
          key={rowIndex}
          isChecked={selectedRowIds.indexOf(row.id) >= 0}
          onCheckChanged={toggleRow}
          row={row}
        />
      );
    });
  }

  function renderInnerTable() {
    return (
      <KuiTable>
        <KuiTableHeader>
          <KuiTableHeaderCheckBoxCell
            isChecked={areAllRowsChecked()}
            onChange={toggleAll}
          />
          {columns}
        </KuiTableHeader>

        <KuiTableBody>
          {renderTableRows()}
        </KuiTableBody>
      </KuiTable>
    );
  }

  function renderLoadingPanel() {
    return (
      <KuiEmptyTablePromptPanel>
        <KuiTableInfo>
          Loading...
        </KuiTableInfo>
      </KuiEmptyTablePromptPanel>
    );
  }

  function renderNoItemsMatchedSearch() {
    return (
      <KuiEmptyTablePromptPanel>
        <KuiTableInfo>
          No items matched your search.
        </KuiTableInfo>
      </KuiEmptyTablePromptPanel>
    );
  }

  function renderContents() {
    if (loading) {
      return renderLoadingPanel();
    } else if (rows.length === 0) {
      return filter ? renderNoItemsMatchedSearch() : noItemsPrompt;
    } else {
      return renderInnerTable();
    }
  }

  return (
    <KuiControlledTable>
      <KuiListingTableToolbar
        actionComponent={toolbarActions}
        pagerComponent={pager}
        onFilter={onFilter}
        filter={filter}
      />

      {renderContents()}

      <KuiListingTableToolbarFooter
        itemsSelectedCount={selectedRowIds.length}
        pagerComponent={pager}
      />
    </KuiControlledTable>
  );
}

KuiListingTable.PropTypes = {
  columns: PropTypes.arrayOf(PropTypes.node),
  rows: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    cells: PropTypes.arrayOf(PropTypes.node),
  })),
  pager: PropTypes.node,
  onItemSelectionChanged: PropTypes.func.isRequired,
  selectedRowIds: PropTypes.array,
  noItemsPrompt: PropTypes.node,
  onFilter: PropTypes.func,
  toolbarActions: PropTypes.node,
  filter: PropTypes.string,
  loading: PropTypes.bool,
};

