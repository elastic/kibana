/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiButtonEmpty,
  EuiSelectable,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const sortByLabel  = (a, b) => {
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  return 0;
};

const ENTRY_KEY_INDEX = 0;
const ENTRY_VALUE_INDEX = 1;

function getOptions(fields, selectedFields) {
  if (!fields) {
    return [];
  }

  const fieldsByTypeMap = new Map();

  fields
    .filter(field => {
      // remove selected fields
      const isFieldSelected = !!selectedFields.find(selectedField => {
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
    // Field list only contains a single type, no need to display group label for type header
    options.push(...fieldTypeEntries[0][ENTRY_VALUE_INDEX].sort(sortByLabel));
  } else {
    // Display group label per type header
    fieldTypeEntries
      .sort((a, b) => {
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

  return options;
}

export class AddTooltipFieldPopover extends Component {

  state = {
    isPopoverOpen: false,
    checkedFields: [],
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.fields !== prevState.prevFields
      || nextProps.selectedFields !== prevState.prevSelectedFields) {
      return {
        options: getOptions(nextProps.fields, nextProps.selectedFields),
        prevFields: nextProps.fields,
        prevSelectedFields: nextProps.selectedFields,
      };
    }

    return null;
  }

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
    const checkedFields = options
      .filter(option => {
        return option.checked === 'on';
      })
      .map(option => {
        return option.value;
      });

    console.log(checkedFields);

    this.setState({
      checkedFields,
      options,
    });
  }

  _onAdd = () => {
    this.props.onAdd(this.state.checkedFields);
    this.setState({ checkedFields: [] });
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
          id="xpack.maps.tooltipSelector.togglePopoverLabel"
          defaultMessage="Add"
        />
      </EuiButtonEmpty>
    );
  }

  _renderContent() {
    const addLabel = this.state.checkedFields.length === 0
      ? i18n.translate('xpack.maps.tooltipSelector.addLabelWithoutCount', {
        defaultMessage: 'Add',
      })
      : i18n.translate('xpack.maps.tooltipSelector.addLabelWithCount', {
        defaultMessage: 'Add {count}',
        values: { count: this.state.checkedFields.length }
      });

    return (
      <Fragment>
        <EuiSelectable
          searchable
          options={this.state.options}
          onChange={this._onSelect}
        >
          {(list, search) => (
            <div style={{ width: '300px' }}>
              <EuiPopoverTitle>{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>

        <EuiSpacer size="xs" />
        <EuiPopoverFooter>
          <EuiButton
            fill
            isDisabled={this.state.checkedFields.length === 0}
            onClick={this._onAdd}
          >
            {addLabel}
          </EuiButton>
        </EuiPopoverFooter>
      </Fragment>
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
