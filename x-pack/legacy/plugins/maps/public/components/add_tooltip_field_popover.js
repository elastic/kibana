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

const ENTRY_KEY_INDEX = 0;
const ENTRY_VALUE_INDEX = 1;

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
      .filter(field => {
        // remove selected fields
        const isFieldSelected = !!this.props.selectedFields.find(selectedField => {
          return field.name === selectedField.name;
        });
        return !isFieldSelected;
      })
      .forEach(field => {
        const fieldLabel = 'label' in field ? field.label : field.name;
        const option = {
          value: field.name,
          label: fieldLabel,
        };
        if (fieldsByTypeMap.has(field.type)) {
          const fieldsList = fieldsByTypeMap.get(field.type);
          fieldsList.push(option);
          fieldsByTypeMap.set(field.type, fieldsList);
        } else {
          fieldsByTypeMap.set(field.type, [option]);
        }
      });

    const fieldTypeEntries = [...fieldsByTypeMap.entries()];
    const options = [];
    if (fieldTypeEntries.length === 1) {
      // Field list only contains a single type, no need to display type headers
      options.push(...fieldTypeEntries[0][ENTRY_VALUE_INDEX].sort(sortByLabel));
    } else {
      fieldTypeEntries
        .sort((a, b) => {
          console.log('a', a);
          console.log('b', b);
          if (a[ENTRY_KEY_INDEX] < b[ENTRY_KEY_INDEX]) return -1;
          if (a[ENTRY_KEY_INDEX] > b[ENTRY_KEY_INDEX]) return 1;
          return 0;
        })
        .forEach(entry => {
          const fieldType = entry[ENTRY_KEY_INDEX];
          const fieldTypeOptions = entry[ENTRY_VALUE_INDEX].sort(sortByLabel);
          options.push({
            label: fieldType,
            isGroupLabel: true
          });
          options.push(...fieldTypeOptions);
        });
    }

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
