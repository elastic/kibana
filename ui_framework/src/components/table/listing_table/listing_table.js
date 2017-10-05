import React from 'react';
import PropTypes from 'prop-types';

import { KuiListingTableToolBar } from './listing_table_tool_bar';
import { KuiListingTableToolBarFooter } from './listing_table_tool_bar_footer';
import { KuiListingTableRow } from './listing_table_row';

import {
  KuiControlledTable,
  KuiTableHeaderCheckBoxCell,
  KuiTableBody,
  KuiTableHeader,
  KuiTable,
} from '../../index';

export function KuiListingTable({
  rows,
  columns,
  pager,
  toolBarActions,
  onFilter,
  onItemSelectionChanged,
  selectedRowIds,
  filter,
  prompt,
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
          onSelectionChanged={toggleRow}
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

  return (
    <KuiControlledTable>
      <KuiListingTableToolBar
        actions={toolBarActions}
        pager={pager}
        onFilter={onFilter}
        filter={filter}
      />

      {prompt ? prompt : renderInnerTable()}

      <KuiListingTableToolBarFooter
        itemsSelectedCount={selectedRowIds.length}
        pager={pager}
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
  prompt: PropTypes.node, // If given, will be shown instead of a table with rows.
  onFilter: PropTypes.func,
  toolBarActions: PropTypes.node,
  filter: PropTypes.string,
};

KuiListingTable.defaultProps = {
  rows: [],
  selectedRowIds: [],
};
