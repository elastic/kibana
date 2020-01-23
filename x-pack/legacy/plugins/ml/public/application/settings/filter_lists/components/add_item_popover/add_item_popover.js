/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React popover for adding items to a filter list.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';

export class AddItemPopover extends Component {
  static displayName = 'AddItemPopover';
  static propTypes = {
    addItems: PropTypes.func.isRequired,
    canCreateFilter: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
      itemsText: '',
    };
  }

  onItemsTextChange = e => {
    this.setState({
      itemsText: e.target.value,
    });
  };

  onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  onAddButtonClick = () => {
    const items = this.state.itemsText.split('\n');
    const addItems = [];
    // Remove duplicates.
    items.forEach(item => {
      if (addItems.indexOf(item) === -1 && item.length > 0) {
        addItems.push(item);
      }
    });

    this.props.addItems(addItems);
    this.setState({
      isPopoverOpen: false,
      itemsText: '',
    });
  };

  render() {
    const button = (
      <EuiButton
        size="s"
        color="primary"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
        isDisabled={this.props.canCreateFilter === false}
      >
        <FormattedMessage
          id="xpack.ml.settings.filterLists.addItemPopover.addItemButtonLabel"
          defaultMessage="Add item"
        />
      </EuiButton>
    );

    return (
      <div>
        <EuiPopover
          id="add_item_popover"
          panelClassName="ml-add-filter-item-popover"
          ownFocus
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover}
        >
          <EuiForm>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.settings.filterLists.addItemPopover.itemsLabel"
                  defaultMessage="Items"
                />
              }
            >
              <EuiTextArea value={this.state.itemsText} onChange={this.onItemsTextChange} />
            </EuiFormRow>
          </EuiForm>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.ml.settings.filterLists.addItemPopover.enterItemPerLineDescription"
              defaultMessage="Enter one item per line"
            />
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={this.onAddButtonClick}
                disabled={this.state.itemsText.length === 0}
              >
                <FormattedMessage
                  id="xpack.ml.settings.filterLists.addItemPopover.addButtonLabel"
                  defaultMessage="Add"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopover>
      </div>
    );
  }
}
