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
  EuiTextAlign
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '../../../../../../src/plugins/kibana_react/public';

const sortByLabel  = (a, b) => {
  return a.label.localeCompare(b.label);
};

function getOptions(fields, selectedFields) {
  if (!fields) {
    return [];
  }

  return fields
    .filter(field => {
      // remove selected fields
      const isFieldSelected = !!selectedFields.find(selectedField => {
        return field.name === selectedField.name;
      });
      return !isFieldSelected;
    })
    .map(field => {
      return {
        value: field.name,
        prepend: 'type' in field ? <FieldIcon type={field.type} size="m" useColor /> : null,
        label: 'label' in field ? field.label : field.name,
      };
    })
    .sort(sortByLabel);
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
        checkedFields: [],
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
          <EuiTextAlign textAlign="right">
            <EuiButton
              fill
              isDisabled={this.state.checkedFields.length === 0}
              onClick={this._onAdd}
              size="s"
            >
              {addLabel}
            </EuiButton>
          </EuiTextAlign>
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
        ownFocus
      >
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
