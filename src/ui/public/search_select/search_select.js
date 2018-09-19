/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPopover,
  EuiBasicTable,
  EuiFieldSearch,
  EuiSpacer,
} from '@elastic/eui';

import './search_select.less';

export class SearchSelect extends Component {
  static propTypes = {
    button: PropTypes.node.isRequired,
    columns: PropTypes.array.isRequired,
    items: PropTypes.array.isRequired,
    isOpen: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    onSelectItem: PropTypes.func.isRequired,
    searchField: PropTypes.string.isRequired,
    prompt: PropTypes.string,
    anchorPosition: PropTypes.string,
  }

  static defaultProps = {
    prompt: 'Search',
  }

  constructor(props) {
    super(props);

    this.state = {
      searchValue: '',
    };
  }

  onSearch = (e) => {
    this.setState({
      searchValue: e.target.value,
    });
  };

  render() {
    const {
      columns,
      button,
      items,
      onSelectItem,
      searchField,
      isOpen,
      close,
      prompt,
      anchorPosition,
      className,
      ...rest
    } = this.props;

    const {
      searchValue,
    } = this.state;

    const getRowProps = (item) => {
      return {
        className: 'searchSelectTableRow',
        onClick: () => {
          onSelectItem(item);
        },
      };
    };

    const searchedItems = searchValue ? items.filter(item => (
      item[searchField].toLowerCase().includes(searchValue.trim().toLowerCase())
    )) : items;

    return (
      <EuiPopover
        ownFocus
        button={button}
        isOpen={isOpen}
        closePopover={close}
        anchorPosition={anchorPosition}
        classes={className}
        {...rest}
      >
        <EuiFieldSearch
          placeholder={prompt}
          value={searchValue}
          onChange={this.onSearch}
          aria-label={prompt}
          fullWidth
        />

        <EuiSpacer size="s" />

        <div className="searchSelectContainer">
          <EuiBasicTable
            items={searchedItems}
            columns={columns}
            rowProps={getRowProps}
            responsive={false}
          />
        </div>
      </EuiPopover>
    );
  }
}
