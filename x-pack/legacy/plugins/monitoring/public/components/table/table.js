/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { camelCase, isEqual, sortByOrder, get, includes } from 'lodash';
import {
  DEFAULT_NO_DATA_MESSAGE,
  DEFAULT_NO_DATA_MESSAGE_WITH_FILTER,
  TABLE_ACTION_UPDATE_FILTER,
  TABLE_ACTION_RESET_PAGING,
} from '../../../common/constants';
import {
  KuiControlledTable,
  KuiPagerButtonGroup,
  KuiTable,
  KuiTableHeaderCell
} from '@kbn/ui-framework/components';
import { MonitoringTableToolBar } from './toolbar';
import { MonitoringTableNoData } from './no_data';
import { MonitoringTableFooter } from './footer';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

/*
 * State and data management for Monitoring Tables
 * To be used when all the data is loaded at once and must be paged in the browser
 * - Sort the data
 * - Show the data
 * - Allow the user to change how the data is sorted
 * - Allow the user to filter the data
 * - Allow the user to page through the data
 *
 * Guide to column configuration:
 * const columns = [
 *  {
 *    title: 'Name', // visible title string
 *    sortKey: 'metadata.name', // sorting this column sorts by the `metadata.name` field in the data
 *    secondarySortOrder: 1, // optional field, makes the column secondarily sorted by default
 *  },
 *  {
 *    title: 'Status', // visible title string
 *    sortKey: 'status', // sorting this column sorts by the `metadata.name` field in the data
 *    sortOrder: -1, // optional field, makes the column sorted by default
 *  }
 * ];
 */
export class MonitoringTable extends React.Component {
  constructor(props) {
    super(props);

    let sortKey = props.sortKey;
    let sortOrder = props.sortOrder;
    if (props.sortKey === undefined || props.sortOrder === undefined) {
      // find the col to sort by per table config
      const defaultSortColumn = props.columns.find(c => c.hasOwnProperty('sortOrder'));
      sortKey = defaultSortColumn ? defaultSortColumn.sortKey : null;
      sortOrder = defaultSortColumn ? defaultSortColumn.sortOrder : null;
    }

    // find the secondary col to sort by per table config
    const secondarySortColumn = props.columns.find(c => c.hasOwnProperty('secondarySortOrder'));
    const secondarySortKey = secondarySortColumn ? secondarySortColumn.sortKey : null;
    const secondarySortOrder = secondarySortColumn ? secondarySortColumn.secondarySortOrder : null;

    this.state = {
      rows: props.rows,
      sortKey,
      sortOrder,
      secondarySortKey,
      secondarySortOrder,
      filterText: props.filterText || '',
      pageIndex: props.pageIndex || 1
    };

    this.paginationOnPrevious = this.paginationOnPrevious.bind(this);
    this.paginationOnNext = this.paginationOnNext.bind(this);
    this.onFilterChange = this.onFilterChange.bind(this);
    this.dispatchTableAction = this.dispatchTableAction.bind(this);
  }

  setFilter(filterText) {
    this.setState(prevState => {
      const newState = {
        ...prevState,
        pageIndex: 1,
        filterText
      };

      this.onNewState(newState);
      return newState;
    });
  }

  resetPaging() {
    this.setState(prevState => {
      const newState = {
        ...prevState,
        pageIndex: 1
      };

      this.onNewState(newState);
      return newState;
    });
  }

  /*
   * This function is passed to child components, and called when something in
   * this state needs to change
   * @param {String} action - A constant to identify the action
   * @param {Any} value - Payload data for the action, if any is needed
   */
  dispatchTableAction(action, value) {
    // handle the action
    switch (action) {
      case TABLE_ACTION_UPDATE_FILTER:
        this.setFilter(value);
        break;
      case TABLE_ACTION_RESET_PAGING:
        this.resetPaging();
        break;
      default:
        throw new Error(
          i18n.translate('xpack.monitoring.table.unknownTableActionTypeErrorMessage', {
            defaultMessage: `Unknown table action type {action}! This shouldn't happen!`,

            values: {
              action
            }
          })
        );
    }
  }

  /*
   * Handle an interaction in the UI by calling to the external function (from
   * angular controller) that does something extra
   */
  onNewState(newState) {
    if (this.props.onNewState) {
      this.props.onNewState(newState); // call top-level function
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const diffRows = !isEqual(nextProps.rows, this.props.rows);
    const diffState = !isEqual(nextState, this.state);

    if (diffRows || diffState) {
      return true;
    }
    return false;
  }

  componentWillReceiveProps({ rows }) {
    // Any prop change will cause a re-render, as long as it's the `rows` prop :)
    this.setState({ rows });
  }

  /*
   * Return true if the row matches the filter value
   * @param {Object} row - Data object for which the table is configured to display
   */
  checkRowFilterMatch(row) {
    const values = this.props.filterFields.map(field => get(row, field)); // find the values of the filterable fields
    return includes(values.join(' ').toLowerCase(), this.state.filterText.toLowerCase());
  }

  /*
   * Return a filtered set of rows that have data that match the filter text
   * @param {Array} rows
   */
  getFilteredRows(rows = []) {
    if (!this.state.filterText) {
      return rows; // filter is cleared, no rows are filtered out
    }
    return rows.filter(row => this.checkRowFilterMatch(row));
  }

  /*
   * Handle UI event of entering text in the Filter text input box
   * @param {Object} event - UI event data
   */
  onFilterChange(filterText) {
    this.setFilter(filterText);
  }

  paginationHasPrevious() {
    return this.state.pageIndex > 1;
  }

  paginationOnPrevious() {
    this.setState(prevState => {
      const newState = {
        ...prevState,
        pageIndex: prevState.pageIndex - 1
      };

      this.onNewState(newState);
      return newState;
    });

  }

  paginationHasNext(numAvailableRows) {
    const pageIndex = this.state.pageIndex;
    const numPages = Math.ceil(numAvailableRows / this.props.rowsPerPage);
    return pageIndex < numPages;
  }

  paginationOnNext() {
    this.setState(prevState => {
      const newState = {
        ...prevState,
        pageIndex: prevState.pageIndex + 1
      };

      this.onNewState(newState);
      return newState;
    });
  }

  /*
   * @param {Number} numAvailableRows - total number of rows in the table
   */
  getPaginationControls(numAvailableRows, alwaysShowPageControls) {
    let shouldShow = false;
    if (this.isPaginationRequired(numAvailableRows) || alwaysShowPageControls) {
      shouldShow = true;
    }

    if (!shouldShow) {
      return null;
    }

    const hasPrevious = this.paginationHasPrevious();
    const hasNext = this.paginationHasNext(numAvailableRows);

    return (
      <KuiPagerButtonGroup
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        onPrevious={this.paginationOnPrevious}
        onNext={this.paginationOnNext}
      />
    );
  }

  calculateFirstRow() {
    return (this.state.pageIndex * this.props.rowsPerPage) - this.props.rowsPerPage;
  }

  /*
   * @param {Array} visibleRows - rows of data after they've been filtered and sorted
   * @param {Number} numAvailableRows - number of rows total on all the pages
   */
  getToolBar(numVisibleRows, numAvailableRows) {
    const firstRow = this.calculateFirstRow();

    return (
      <MonitoringTableToolBar
        showSearchBox={this.isSearchBoxShown()}
        pageIndexFirstRow={numVisibleRows ? firstRow + 1 : 0}
        pageIndexLastRow={numVisibleRows ? numVisibleRows + firstRow : 0}
        rowsFiltered={numAvailableRows}
        totalRows={this.state.rows.length}
        filterText={this.state.filterText}
        paginationControls={this.getPaginationControls(numAvailableRows, this.props.alwaysShowPageControls)}
        onFilterChange={this.onFilterChange}
        dispatchTableAction={this.dispatchTableAction}
        {...this.props}
      />
    );
  }

  /*
   * Update state based on how the user wants to sort/resort data per column sorting
   * Note: secondary sort is not apparent to the user through icons. Secondary
   * sort order is discarded when the user changes the sorting state.
   * @param {Object} col - Column configuration object
   */
  setSortColumn({ sortKey }) {
    // clicking the column that is already sorted reverses the sort order
    this.setState(prevState => {
      let newSortOrder;

      if (sortKey === this.state.sortKey) {
        // same column, reverse the sort
        newSortOrder = prevState.sortOrder * -1;
      } else {
        // new column, set to ASC sort
        newSortOrder = 1;
      }

      const newState = {
        ...prevState,
        sortOrder: newSortOrder,
        sortKey
      };

      this.onNewState(newState);
      return newState;
    });
  }

  /*
   * Render the table header cells
   */
  getTableHeader() {
    return this.props.columns.map(col => {
      const headerCellProps = {};
      if (col.headerCellProps) {
        Object.assign(headerCellProps, col.headerCellProps);
      }

      const colKey = camelCase(col.title);
      // if onSort is null, then col is not sortable
      return (
        <KuiTableHeaderCell
          key={`kuiTableHeaderCell-${colKey}`}
          onSort={col.sortKey !== null ? this.setSortColumn.bind(this, col) : null}
          isSorted={this.state.sortKey === col.sortKey}
          isSortAscending={this.state.sortKey === col.sortKey ? this.state.sortOrder > 0 : true}
          data-test-subj={`tableHeaderCell-${colKey}`}
          {...headerCellProps}
        >
          { col.title }
        </KuiTableHeaderCell>
      );
    });
  }

  /*
   * @param {Array} visibleRows - rows of data after they've been filtered and sorted
   * @param {Number} numAvailableRows - number of rows total on all the pages
   */
  getFooter(numVisibleRows, numAvailableRows, alwaysShowPageControls) {
    if (!this.isPaginationRequired(numAvailableRows)) {
      return null;
    }

    const firstRow = this.calculateFirstRow();
    return (
      <MonitoringTableFooter
        pageIndexFirstRow={numVisibleRows ? firstRow + 1 : 0}
        pageIndexLastRow={numVisibleRows ? numVisibleRows + firstRow : 0}
        rowsFiltered={numAvailableRows}
        paginationControls={this.getPaginationControls(numAvailableRows, alwaysShowPageControls)}
      />
    );
  }

  /*
   * @param {Array} rows - rows of data that need to be sorted
   */
  sortRows(rows = []) {
    if (!this.state.sortKey) {
      return rows;
    }

    const _sortOrder = this.state.sortOrder > 0 ? 'asc' : 'desc';
    let _secondarySortOrder;
    if (this.state.secondarySortOrder) {
      _secondarySortOrder = this.state.secondarySortOrder > 0 ? 'asc' : 'desc';
    }

    return sortByOrder(rows, [this.state.sortKey, this.state.secondarySortKey], [_sortOrder, _secondarySortOrder]);
  }

  /*
   * Filter the rows, sort the rows, get the rows to show for the current page
   * Important: Should be only called from render
   * @param {Array} rows - rows of data for which the table is meant to display
   */
  getVisibleRows(rows) {
    // [1] filter the rows
    const filteredRows = this.getFilteredRows(rows);
    const numAvailableRows = filteredRows.length;
    // [2] sort the filtered rows
    const sortedRows = this.sortRows(filteredRows);
    // [3] paginate the sorted filtered rows
    const firstRow = this.calculateFirstRow();
    const visibleRows = sortedRows.slice(firstRow, firstRow + this.props.rowsPerPage) || [];

    return {
      numAvailableRows,
      visibleRows
    };
  }

  isPaginationRequired(numAvailableRows) {
    const hasPrevious = this.paginationHasPrevious();
    const hasNext = this.paginationHasNext(numAvailableRows);

    return hasPrevious || hasNext;
  }

  isSearchBoxShown() {
    return Boolean(this.props.filterFields) && (this.props.filterFields.length > 0);
  }

  render() {
    const classes = classNames(this.props.className, 'monTable');

    let table; // This will come out to either be the KuiTable or a "No Data" message

    // guard the possibility that rows are null (data is loading)
    const { visibleRows, numAvailableRows } = this.getVisibleRows(this.state.rows || []);
    const numVisibleRows = visibleRows.length;

    if (this.state.rows === null) {
      // rows are null, show loading message
      table = (<MonitoringTableNoData
        message={(
          <FormattedMessage
            id="xpack.monitoring.table.loadingTitle"
            defaultMessage="Loading…"
          />
        )}
      />);
    } else if (numVisibleRows > 0) {
      // data has some rows, show them
      const RowComponent = this.props.rowComponent;
      const tBody = visibleRows.map((rowData, rowIndex) => {
        return (
          <RowComponent
            {...rowData}
            key={`rowData-${rowIndex}`}
            dispatchTableAction={this.dispatchTableAction}
          />
        );
      });

      table = (
        <KuiTable shrinkToContent={true}>
          <thead>
            <tr>
              { this.getTableHeader() }
            </tr>
          </thead>
          <tbody data-test-subj={`${this.props.className}Body`}>
            { tBody }
          </tbody>
        </KuiTable>
      );
    } else {
      table = <MonitoringTableNoData message={this.props.getNoDataMessage(this.state.filterText)} />;
    }

    return (
      <KuiControlledTable className={classes} data-test-subj={`${this.props.className}Container`} style={{ margin: 10 }}>
        { this.getToolBar(numVisibleRows, numAvailableRows) }
        { table }
        { this.getFooter(numVisibleRows, numAvailableRows, this.props.alwaysShowPageControls) }
      </KuiControlledTable>
    );
  }
}

const defaultGetNoDataMessage = filterText => {
  if (filterText) {
    return DEFAULT_NO_DATA_MESSAGE_WITH_FILTER.replace('{{FILTER}}', filterText.trim());
  }
  return DEFAULT_NO_DATA_MESSAGE;
};

MonitoringTable.defaultProps = {
  rows: [],
  filterFields: [],
  getNoDataMessage: defaultGetNoDataMessage,
  alwaysShowPageControls: false,
  rowsPerPage: 20
};
