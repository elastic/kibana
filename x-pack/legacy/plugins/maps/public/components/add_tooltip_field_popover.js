/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiSelectable,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const sortByLabel  = (a, b) => {
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  return 0;
};

export class AddTooltipFieldPopover extends Component {

  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _onSelect = (options) => {
    const selectedField = options.find(option => {
      return option.checked === 'on';
    });
    if (selectedField) {
      this.props.onSelect(selectedField.value);
    }
    this._closePopover();
  }

  _renderAddButton() {
    return (
      <EuiButtonEmpty
        onClick={this._togglePopover}
        size="xs"
        iconType="plusInCircleFilled"
        isDisabled={!this.props.fields}
      >
        <FormattedMessage
          id="xpack.maps.tooltipSelector.addFieldLabel"
          defaultMessage="Add tooltip field"
        />
      </EuiButtonEmpty>
    );
  }

  _renderContent() {
    if (!this.props.fields) {
      return null;
    }

    const fieldsByTypeMap = new Map();

    this.props.fields
      .forEach(field => {
        const fieldLabel = 'label' in field ? field.label : field.name;
        if (fieldsByTypeMap.has(field.type)) {
          const fieldsList = fieldsByTypeMap.get(field.type);
          fieldsList.push({ value: field.name, label: fieldLabel });
          fieldsByTypeMap.set(field.type, fieldsList);
        } else {
          fieldsByTypeMap.set(field.type, [{ value: field.name, label: fieldLabel }]);
        }
      });

    const options = [];
    [...fieldsByTypeMap.entries()].sort(sortByLabel).forEach(entry => {
      const fieldType = entry[0];
      const fieldTypeOptions = entry[1];
      options.push({
        label: fieldType,
        isGroupLabel: true
      });
      options.push(...fieldTypeOptions);
    });

    return (
      <EuiSelectable
        searchable
        options={options}
        onChange={this._onSelect}
      >
        {(list, search) => (
          <div style={{ width: '300px' }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    );
  }

  render() {
    return (
      <EuiPopover
        id="addTooltipFieldPopover"
        anchorPosition="leftCenter"
        button={this._renderAddButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
      >
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
