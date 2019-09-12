/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFormRow,
  EuiPopover,
  EuiSuperSelect,
} from '@elastic/eui';
import { COLOR_GRADIENTS, getHexColorRangeStrings } from '../../../color_utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { FieldRangeInput } from './field_range_input';

export class AutoGenerateColorRampPopover extends Component {

  state = {
    isPopoverOpen: false,
    numStops: 8,
    min: '',
    max: '',
    colorRamp: COLOR_GRADIENTS[0].value,
  };

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  }

  _generateColorRamp = () => {
    // TODO allow scales other then linear
    const stopSize = (this.state.max -  this.state.min) / this.state.numStops;

    const colors = getHexColorRangeStrings(this.state.colorRamp);
    const colorStops = [];
    for (let i = 0; i < this.state.numStops; i++) {
      colorStops.push({
        stop: this.state.min + (i * stopSize),
        color: colors[i]
      });
    }
    this.props.onChange({ colorStops });
    this.closePopover();
  }

  _onColorRampSelect = (selectedValue) => {
    this.setState({
      colorRamp: selectedValue,
    });
  };

  _onStopsChange = e => {
    const sanitizedValue = parseInt(e.target.value, 10);
    this.setState({
      numStops: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onMinChange = min => {
    this.setState({ min });
  };

  _onMaxChange = max => {
    this.setState({ max });
  };

  renderForm() {
    return (
      <div style={{ width: '300px' }}>
        <EuiFormRow
          label={i18n.translate('xpack.maps.style.autoGenerateColorRamp.colorRampLabel', {
            defaultMessage: 'Colors'
          })}
        >
          <EuiSuperSelect
            options={COLOR_GRADIENTS}
            onChange={this._onColorRampSelect}
            valueOfSelected={this.state.colorRamp}
            hasDividers={true}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.style.autoGenerateColorRamp.stopsLabel', {
            defaultMessage: 'Number of stops'
          })}
        >
          <EuiFieldNumber
            value={this.state.numStops}
            onChange={this._onStopsChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.style.autoGenerateColorRamp.rangeLabel', {
            defaultMessage: 'Field range'
          })}
        >
          <FieldRangeInput
            min={this.state.min}
            max={this.state.max}
            onMinChange={this._onMinChange}
            onMaxChange={this._onMaxChange}
            loadFieldMeta={this.props.loadFieldMeta}
            field={this.props.field}
          />
        </EuiFormRow>

        <EuiButton
          onClick={this._generateColorRamp}
          isDisabled={this.state.min === '' || this.state.max === '' || this.state.min > this.state.max}
        >
          <FormattedMessage
            id="xpack.maps.style.autoGenerateColorRamp.generateButtonLabel"
            defaultMessage="Generate color ramp"
          />
        </EuiButton>
      </div>
    );
  }

  render() {
    const button = (
      <EuiButtonEmpty onClick={this.togglePopover}>
        <FormattedMessage
          id="xpack.maps.style.autoGenerateColorRamp.popoverButtonLabel"
          defaultMessage="Auto generate color ramp"
        />
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="autoGenerateColorRampPopover"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        anchorPosition="leftCenter"
      >
        {this.renderForm()}
      </EuiPopover>
    );
  }
}

AutoGenerateColorRampPopover.propTypes = {
};
