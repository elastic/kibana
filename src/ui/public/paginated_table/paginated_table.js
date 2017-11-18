import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiKeyboardAccessible,
  EuiPagination,
  EuiPopover,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  SortableProperties,
  LEFT_ALIGNMENT,
} from '@elastic/eui';

import { Pager } from 'ui/pager';

export class PaginatedTable extends Component {
  constructor(props) {
    super(props);

    // ngReact will double-instantiate as noted in https://github.com/ngReact/ngReact/issues/198.
    // In the initial instantiationm columns will be undefined, tthrowing an Error "Cannot read
    // property '0' of undefined".
    const initialSortedColumnName = props.columns[props.initialSortedColumn].title;

    this.sortableProperties = new SortableProperties(props.columns
      .filter(column => column.sortable !== false)
      .map(column => {
        return {
          name: column.title,
          getValue: item => {
            const sortedColumnName = this.sortableProperties.getSortedProperty().name;
            const sortedColumnIndex = this.props.columns.findIndex(
              column => column.title === sortedColumnName
            );
            const cell = item[sortedColumnIndex];
            return (cell && cell.value) ? cell.value : '';
          },
          isAscending: true,
        };
      }),
      initialSortedColumnName,
    );

    this.rowsPerPageOptions = [
      { text: '10', value: 10 },
      { text: '25', value: 25 },
      { text: '100', value: 100 },
      { text: 'All', value: 'All' },
    ];

    const initialRowsPerPage = this.rowsPerPageOptions[1];
    this.pager = new Pager(props.rows.length, initialRowsPerPage.value, 1);

    this.state = {
      pageCount: 10,
      pageOfItems: [],
      rowsPerPage: initialRowsPerPage,
      isPageSizePopoverOpen: false,
      sortedColumn: this.sortableProperties.getSortedProperty(),
      sortedColumnDirection: this.sortableProperties.isCurrentSortAscending() ? 'ASC' : 'DESC',
    };
  }

  goToTop = () => {
    window.scrollTo({ top: 0 });
  };

  goToPage = page => {
    this.pager.setPage(page + 1);
    this.calculateItemsOnPage();
  };

  onPageSizeButtonClick = () => {
    this.setState({
      isPageSizePopoverOpen: !this.state.isPageSizePopoverOpen,
    });
  };

  closePageSizePopover = () => {
    this.setState({
      isPageSizePopoverOpen: false,
    });
  };

  onChangeRowsPerPage = rowsPerPageValue => {
    const rowsPerPageOption = this.rowsPerPageOptions.find(option => option.value === rowsPerPageValue);
    const numberOfRowsPerPage =
      (rowsPerPageValue === 'All')
      ? this.props.rows.length
      : rowsPerPageValue;

    this.pager.setPageSize(numberOfRowsPerPage);

    this.setState({
      rowsPerPage: rowsPerPageOption,
      isPageSizePopoverOpen: false,
    });

    this.calculateItemsOnPage();
  };

  sortColumn = columnIndex => {
    const propertyName = this.props.columns[columnIndex].title;
    this.sortableProperties.sortOn(propertyName);
    this.setState({
      sortedColumn: this.sortableProperties.getSortedProperty(),
      sortedColumnDirection: this.sortableProperties.isCurrentSortAscending() ? 'ASC' : 'DESC',
    });
    this.calculateItemsOnPage();
  };

  calculateItemsOnPage = (items = this.props.rows) => {
    const sortedRows = this.sortableProperties.sortItems(items);
    this.pager.setTotalItems(sortedRows.length);
    const pageOfItems = sortedRows.slice(this.pager.startIndex, this.pager.startIndex + this.pager.pageSize);
    this.setState({
      pageOfItems,
    });
  };

  componentDidMount() {
    this.calculateItemsOnPage();
  }

  componentWillReceiveProps(nextProps) {
    this.calculateItemsOnPage(nextProps.rows);
  }

  renderHeaderCells() {
    return this.props.columns.map((column, index) => {
      const {
        class: colClass,
        title,
        text,
        sortable,
      } = column;

      return (
        <EuiTableHeaderCell
          key={index}
          onSort={sortable !== false ? () => { this.sortColumn(index); } : undefined}
          isSorted={title === this.state.sortedColumn}
          isSortAscending={this.sortableProperties.isAscendingByName(title)}
          align={column.align || LEFT_ALIGNMENT}
        >
          {text}
        </EuiTableHeaderCell>
      );

      return (
        <EuiKeyboardAccessible key={index}>
          <th
            onClick={() => { this.sortColumn(index); }}
            className={colClass}
          >
            <span>{title}</span>
            {/*<kbn-info ng-if="col.info" info="{{ col.info }}" placement="top"></kbn-info>*/}
            {/*!i
              ng-if="col.sortable !== false"
              className="fa"
              ng-className="{
                'fa-sort-asc': paginatedTable.sort.columnIndex === $index && paginatedTable.sort.direction === 'asc',
                'fa-sort-desc': paginatedTable.sort.columnIndex === $index && paginatedTable.sort.direction === 'desc',
                'fa-sort': paginatedTable.sort.columnIndex !== $index || paginatedTable.sort.direction === null
              }">
            </i>*/}
          </th>
        </EuiKeyboardAccessible>
      );
    });
  }

  renderRows() {
    return this.state.pageOfItems.map((item, index) => {
      const cells = item.map((cell, cellIndex) => {
        const column = this.props.columns[cellIndex];

        return (
          <EuiTableRowCell
            key={cellIndex}
            align={column.align || LEFT_ALIGNMENT}
          >
            {cell.render()}
          </EuiTableRowCell>
        );
      });

      return (
        <EuiTableRow
          key={index}
        >
          {cells}
        </EuiTableRow>
      );
    });
  }

  renderPaginationControls() {
    const {
      linkToTop,
    } = this.props;

    let goToTopButton;

    if (linkToTop) {
      goToTopButton = (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={this.goToTop}
            data-test-subj="paginateControlsLinkToTop"
          >
            Scroll to top
          </EuiButtonEmpty>
        </EuiFlexItem>
      );
    }

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onPageSizeButtonClick}
      >
        Rows per page: {this.state.rowsPerPage.text}
      </EuiButtonEmpty>
    );

    const rowsPerPageOptions = this.rowsPerPageOptions.map((option, index) => (
      <EuiContextMenuItem
        key={index}
        icon={option.value === this.state.rowsPerPage.value ? 'check' : 'empty'}
        onClick={() => { this.onChangeRowsPerPage(option.value); }}
      >
        {option.text}
      </EuiContextMenuItem>
    ));

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            {goToTopButton}

            <EuiFlexItem grow={false}>
              <EuiPopover
                id="customizablePagination"
                button={button}
                isOpen={this.state.isPageSizePopoverOpen}
                closePopover={this.closePageSizePopover}
                panelPaddingSize="none"
                withTitle
              >
                <EuiContextMenuPanel
                  items={rowsPerPageOptions}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPagination
            pageCount={this.pager.totalPages}
            activePage={this.pager.currentPage - 1}
            onPageClick={this.goToPage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    const {
      columns,
      showTotal,
    } = this.props;

    let footer;

    if (showTotal) {
      const footerCells = columns.map((column, index) => (
        <th
          className="numeric-value"
          key={index}
        >
          {column.total}
        </th>
      ));

      // TODO: Add footer to EUI Table.
      footer = (
        <tfoot>
          <tr>
            {footerCells}
          </tr>
        </tfoot>
      );
    }

    return (
      <div>
        <EuiTable compressed>
          <EuiTableHeader data-test-subj="paginated-table-header">
            {this.renderHeaderCells()}
          </EuiTableHeader>

          <EuiTableBody data-test-subj="paginated-table-body">
            {this.renderRows()}
            {footer}
          </EuiTableBody>
        </EuiTable>

        <EuiSpacer size="m" />

        {this.renderPaginationControls()}
      </div>
    );
  }
}

PaginatedTable.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.array,
  linkToTop: PropTypes.bool,
  perPage: PropTypes.number,
  showBlankRows: PropTypes.bool,
  showTotal: PropTypes.bool,
  initialSortedColumn: PropTypes.number,
};

PaginatedTable.defaultProps = {
  rows: [],
  perPage: 0,
  initialSortedColumn: 0,
};
