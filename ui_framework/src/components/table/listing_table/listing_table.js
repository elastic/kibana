import React from 'react';
import PropTypes from 'prop-types';

import _ from 'lodash';

import { KuiListingTableToolBar } from './listing_table_tool_bar';
import { KuiListingTableToolBarFooter } from './listing_table_tool_bar_footer';
import { KuiListingTableRow } from './listing_table_row';

import {
  KuiControlledTable,
  KuiTableHeaderCheckBoxCell,
  KuiTableBody,
  KuiTableHeader,
  KuiTable,
  KuiTableHeaderCell,
} from '../../index';

import {
  LEFT_ALIGNMENT,
  RIGHT_ALIGNMENT,
} from '../../../services';

export function KuiListingTable({
  rows,
  header,
  pager,
  toolBarActions,
  onFilter,
  onItemSelectionChanged,
  selectedRowIds,
  filter,
  prompt,
}) {

  function areAllRowsSelected() {
    return rows.length > 0 && rows.length === selectedRowIds.length;
  }

  function toggleAll() {
    if (areAllRowsSelected()) {
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
          isSelected={selectedRowIds.indexOf(row.id) >= 0}
          onSelectionChanged={toggleRow}
          row={row}
        />
      );
    });
  }

  function renderHeader() {
    return header.map((cell, index) => {
      let { content, ...props } = cell;
      if (React.isValidElement(cell) || !_.isObject(cell)) {
        props = [];
        content = cell;
      }
      return (
        <KuiTableHeaderCell
          key={index}
          {...props}
        >
          {content}
        </KuiTableHeaderCell>
      );
    });
  }

  function renderInnerTable() {
    return (
      <KuiTable>
        <KuiTableHeader>
          <KuiTableHeaderCheckBoxCell
            isChecked={areAllRowsSelected()}
            onChange={toggleAll}
          />
          {renderHeader()}
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

KuiListingTable.propTypes = {
  header: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.node,
      PropTypes.shape({
        content: PropTypes.node,
        align: PropTypes.oneOf([LEFT_ALIGNMENT, RIGHT_ALIGNMENT]),
        onSort: PropTypes.func,
        isSortAscending: PropTypes.bool,
        isSorted: PropTypes.bool,
      }),
    ]
    )),
  rows: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    cells: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.shape({
          content: PropTypes.node,
          align: PropTypes.oneOf([LEFT_ALIGNMENT, RIGHT_ALIGNMENT]),
        }),
      ],
      )),
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
