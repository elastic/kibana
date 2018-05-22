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
      totalItems: 0,
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

  onTableChange = ({ page }) => {
    this.setState({
      page: page.index,
      perPage: page.size,
    }, this.fetchItems);
  }

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this.props.find(
      this.props.savedObjectType,
      filter,
      this.state.page + 1, // EuiBasicTable paging is 0-index based and savedObjectCliet find is 1-index based
      this.state.perPage);

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
        totalItems: response.total,
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
      totalItemCount: this.state.totalItems,
      pageSizeOptions: [5, 10],
    };
    const tableColumns = [
      {
        field: 'title',
        name: 'Title',
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
    return (
      <EuiBasicTable
        items={this.state.items}
        loading={this.state.isFetchingItems}
        columns={tableColumns}
        pagination={pagination}
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
