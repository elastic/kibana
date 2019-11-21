/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';
import { COLOR_GRADIENTS } from '../../../color_utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { ColorStops } from './color_stops';

const CUSTOM_COLOR_RAMP = 'CUSTOM_COLOR_RAMP';

export class ColorRampSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.customColorRamp !== prevState.prevPropsCustomColorRamp) {
      return {
        prevPropsCustomColorRamp: nextProps.customColorRamp, // reset tracker to latest value
        customColorRamp: nextProps.customColorRamp, // reset customColorRamp to latest value
      };
    }

    return null;
  }

  _onColorRampSelect = selectedValue => {
    const useCustomColorRamp = selectedValue === CUSTOM_COLOR_RAMP;
    this.props.onChange({
      color: useCustomColorRamp ? null : selectedValue,
      useCustomColorRamp,
    });
  };

  _onCustomColorRampChange = ({ colorStops, isInvalid }) => {
    // Manage invalid custom color ramp in local state
    if (isInvalid) {
      this.setState({ customColorRamp: colorStops });
      return;
    }

    this.props.onChange({
      customColorRamp: colorStops,
    });
  };

  render() {
    const {
      color,
      onChange, // eslint-disable-line no-unused-vars
      useCustomColorRamp,
      customColorRamp, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    let colorStopsInput;
    if (useCustomColorRamp) {
      colorStopsInput = (
        <Fragment>
          <EuiSpacer size="s" />
          <ColorStops
            colorStops={this.state.customColorRamp}
            onChange={this._onCustomColorRampChange}
          />
        </Fragment>
      );
    }

    const colorRampOptions = [
      {
        value: CUSTOM_COLOR_RAMP,
        inputDisplay: (
          <FormattedMessage
            id="xpack.maps.style.customColorRampLabel"
            defaultMessage="Custom color ramp"
          />
        ),
      },
      ...COLOR_GRADIENTS,
    ];

    return (
      <Fragment>
        <EuiSuperSelect
          options={colorRampOptions}
          onChange={this._onColorRampSelect}
          valueOfSelected={useCustomColorRamp ? CUSTOM_COLOR_RAMP : color}
          hasDividers={true}
          {...rest}
        />
        {colorStopsInput}
      </Fragment>
    );
  }
}

ColorRampSelect.propTypes = {
  color: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  useCustomColorRamp: PropTypes.bool,
  customColorRamp: PropTypes.array,
};
