import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiFieldSearch,
  EuiBasicTable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export class SavedObjectFinder extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      page: 0,
      perPage: 10,
      filter: '',
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchItems();
  }

  onTableChange = ({ page, sort = {} }) => {
    let {
      field: sortField,
      direction: sortDirection,
    } = sort;

    // 3rd sorting state that is not captured by sort - native order (no sort)
    // when switching from desc to asc for the same field - use native order
    if (this.state.sortField === sortField
      && this.state.sortDirection === 'desc'
      && sortDirection === 'asc') {
      sortField = null;
      sortDirection = null;
    }

    this.setState({
      page: page.index,
      perPage: page.size,
      sortField,
      sortDirection,
    });
  }

  // server-side paging not supported
  // 1) saved object client does not support sorting by title because title is only mapped as analyzed
  // 2) can not search on anything other than title because all other fields are stored in opaque JSON strings,
  //    for example, visualizations need to be search by isLab but this is not possible in Elasticsearch side
  //    with the current mappings
  getPageOfItems = () => {
    // do not sort original list to preserve elasticsearch ranking order
    const items = this.state.items.slice();

    if (this.state.sortField) {
      items.sort((a, b) => {
        const fieldA = _.get(a, this.state.sortField, '');
        const fieldB = _.get(b, this.state.sortField, '');
        let order = 1;
        if (this.state.sortDirection === 'desc') {
          order = -1;
        }
        return order * fieldA.toLowerCase().localeCompare(fieldB.toLowerCase());
      });
    }

    // If begin is greater than the length of the sequence, an empty array is returned.
    const startIndex = this.state.page * this.state.perPage;
    // If end is greater than the length of the sequence, slice extracts through to the end of the sequence (arr.length).
    const lastIndex = startIndex + this.state.perPage;
    return items.slice(startIndex, lastIndex);
  }

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this.props.find(this.props.savedObjectType, filter);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        isFetchingItems: false,
        items: response.savedObjects.map(savedObject => {
          return {
            title: savedObject.attributes.title,
            id: savedObject.id,
            type: savedObject.type,
          };
        }),
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch.bind(null, this.state.filter));
  }

  renderSearchBar() {
    let actionBtn;
    if (this.props.callToActionButton) {
      actionBtn = (
        <EuiFlexItem grow={false}>
          {this.props.callToActionButton}
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            placeholder="Search..."
            fullWidth
            value={this.state.filter}
            onChange={(e) => {
              this.setState({
                filter: e.target.value
              }, this.fetchItems);
            }}
            data-test-subj="savedObjectFinderSearchInput"
          />
        </EuiFlexItem>

        {actionBtn}

      </EuiFlexGroup>
    );
  }

  renderTable() {
    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: [5, 10],
    };
    const sorting = {};
    if (this.state.sortField) {
      sorting.sort = {
        field: this.state.sortField,
        direction: this.state.sortDirection,
      };
    }
    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
        sortable: true,
        render: (field, record) => (
          <EuiLink
            onClick={() => {
              this.props.onChoose(record.id, record.type);
            }}
            data-test-subj={`addPanel${field.split(' ').join('-')}`}
          >
            {field}
          </EuiLink>
        )
      }
    ];
    const items = this.state.items.length === 0 ? [] : this.getPageOfItems();
    return (
      <EuiBasicTable
        items={items}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        pagination={pagination}
        sorting={sorting}
        onChange={this.onTableChange}
        noItemsMessage={this.props.noItemsMessage}
      />
    );
  }

  render() {
    return (
      <React.Fragment>
        {this.renderSearchBar()}
        {this.renderTable()}
      </React.Fragment>
    );
  }
}

SavedObjectFinder.propTypes = {
  callToActionButton: PropTypes.node,
  onChoose: PropTypes.func.isRequired,
  find: PropTypes.func.isRequired,
  noItemsMessage: PropTypes.node,
  savedObjectType: PropTypes.oneOf(['visualization', 'search']).isRequired,
};
