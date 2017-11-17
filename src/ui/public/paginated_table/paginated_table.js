import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiKeyboardAccessible,
} from '@elastic/eui';

import { Pager } from 'ui/pager';

export class PaginatedTable extends Component {
  constructor(props) {
    super(props);

    this.rowsPerPageOptions = [
      { text: '10', value: 10 },
      { text: '25', value: 25 },
      { text: '100', value: 100 },
      { text: 'All', value: 0 },
    ];

    const initialRowsPerPage = this.rowsPerPageOptions[1].value;
    this.pager = new Pager(props.rows.length, initialRowsPerPage, 1);

    this.state = {
      pageCount: 10,
      pageOfItems: [],
      rowsPerPage: initialRowsPerPage,
    };
  }

  goToTop = () => {
    window.scrollTo({ top: 0 });
  };

  onChangeRowsPerPage = event => {
    const rowsPerPage = event.target.value;
    this.setState({ rowsPerPage });
    this.pager.setPageSize(rowsPerPage);
    this.calculateItemsOnPage();
  };

  sortColumn = () => {
    // TODO: Reimplement sorting.
  };

  calculateItemsOnPage = (items = this.props.rows) => {
    // const sortedRows = this.sortableProperties.sortItems(rows);
    this.pager.setTotalItems(items.length);
    const pageOfItems = items.slice(this.pager.startIndex, this.pager.startIndex + this.pager.pageSize);
    this.setState({
      pageOfItems,
      // pageStartNumber: this.pager.startItem,
    });
  };

  componentDidMount() {
    this.calculateItemsOnPage();
  }

  componentWillReceiveProps(nextProps) {
    this.calculateItemsOnPage(nextProps.rows);
  }

  renderColumns() {
    return this.props.columns.map((column, index) => {
      const {
        class: colClass,
        title,
      } = column;

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
      return (
        <tr key={index}>
          {item.map(cell => cell.render())}
        </tr>
      );
    });
  }

  renderPaginationControls() {
    const {
      linkToTop,
      perPage,
    } = this.props;

    let goToTopButton;

    if (linkToTop) {
      goToTopButton = (
        <button
          className="kuiLink"
          onClick={this.goToTop}
          data-test-subj="paginateControlsLinkToTop"
        >
          Scroll to top
        </button>
      );
    }

    let paginationControls;

    if (this.state.pageCount > 1) {
      paginationControls = 'pagination controls';
    }

    let rowsPerPageSelector;

    if (perPage > 0) {
      rowsPerPageSelector = (
        <form className="form-inline pagination-size">
          <div className="form-group">
            <label>Page Size</label>

            <select
              value={this.state.rowsPerPage}
              onChange={this.onChangeRowsPerPage}
              data-test-subj="paginateControlsPageSizeSelect"
            >
              {this.rowsPerPageOptions.map((option, index) => {
                return (
                  <option
                    value={option.value}
                    key={index}
                  >
                    {option.text}
                  </option>
                );
              })}
            </select>
          </div>
        </form>
      );
    }

    return (
      <div>
        {goToTopButton}

        <div
          className="pagination-other-pages"
          data-test-subj="paginationControls"
        >
          {paginationControls}
        </div>

        {rowsPerPageSelector}
      </div>
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
        <table className="table table-condensed">
          <thead data-test-subj="paginated-table-header">
            <tr>
              {this.renderColumns()}
            </tr>
          </thead>

          {/*<tbody
            data-test-subj="paginated-table-body"
            kbn-rows="page"
            kbn-rows-min="paginatedTable.rowsToShow(perPage, page.length)"
          >*/}
          <tbody data-test-subj="paginated-table-body">
            {this.renderRows()}
          </tbody>

          {footer}
        </table>

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
};

PaginatedTable.defaultProps = {
  rows: [],
  columns: [],
  perPage: 0,
};
