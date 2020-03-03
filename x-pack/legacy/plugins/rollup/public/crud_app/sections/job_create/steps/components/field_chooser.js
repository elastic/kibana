/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  EuiButton,
  EuiFieldSearch,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

export class FieldChooser extends Component {
  static propTypes = {
    buttonLabel: PropTypes.node.isRequired,
    columns: PropTypes.array.isRequired,
    fields: PropTypes.array.isRequired,
    selectedFields: PropTypes.array.isRequired,
    onSelectField: PropTypes.func.isRequired,
    prompt: PropTypes.string,
    dataTestSubj: PropTypes.string,
  };

  static defaultProps = {
    prompt: 'Search',
    dataTestSubj: 'rollupJobFieldChooser',
  };

  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      searchValue: '',
    };
  }

  onSearch = e => {
    this.setState({
      searchValue: e.target.value,
    });
  };

  onButtonClick = () => {
    this.setState(state => ({
      isOpen: !state.isOpen,
    }));
  };

  close = () => {
    this.setState({
      isOpen: false,
    });
  };

  render() {
    const {
      buttonLabel,
      columns,
      fields,
      selectedFields,
      prompt,
      onSelectField,
      dataTestSubj,
    } = this.props;

    const { isOpen, searchValue } = this.state;

    const getRowProps = item => {
      return {
        onClick: () => {
          onSelectField(item);
        },
      };
    };

    const renderFlyout = () => {
      // Derive the fields which the user can select.
      const selectedFieldNames = selectedFields.map(({ name }) => name);
      const unselectedFields = fields.filter(({ name }) => {
        return !selectedFieldNames.includes(name);
      });

      const searchedItems = searchValue
        ? unselectedFields.filter(item => {
            const normalizedSearchValue = searchValue.trim().toLowerCase();
            return (
              item.name.toLowerCase().includes(normalizedSearchValue) ||
              item.type.toLowerCase().includes(normalizedSearchValue)
            );
          })
        : unselectedFields;

      return (
        <EuiFlyout
          onClose={this.close}
          aria-labelledby="fieldChooserFlyoutTitle"
          size="m"
          maxWidth={400}
          data-test-subj={dataTestSubj}
        >
          <EuiFlyoutHeader>
            <EuiTitle
              size="m"
              id="fieldChooserFlyoutTitle"
              data-test-subj="rollupJobCreateFlyoutTitle"
            >
              <h2>{buttonLabel}</h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiFieldSearch
              placeholder={prompt}
              value={searchValue}
              onChange={this.onSearch}
              aria-label={prompt}
              fullWidth
            />
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiBasicTable
              items={searchedItems}
              columns={columns}
              rowProps={getRowProps}
              responsive={false}
              data-test-subj={`${dataTestSubj}-table`}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      );
    };
    return (
      <Fragment>
        <EuiButton onClick={this.onButtonClick} data-test-subj="rollupJobShowFieldChooserButton">
          {buttonLabel}
        </EuiButton>

        {isOpen ? renderFlyout() : null}
      </Fragment>
    );
  }
}
