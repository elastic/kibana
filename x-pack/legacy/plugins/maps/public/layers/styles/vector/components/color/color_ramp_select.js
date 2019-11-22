/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { EuiSuperSelect, EuiSpacer, EuiColorStops } from '@elastic/eui';
import { COLOR_GRADIENTS } from '../../../color_utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { isInvalid } from './color_stops_utils';
import { i18n } from '@kbn/i18n';

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

  _onCustomColorRampChange = (colorStops) => {
    if (isInvalid(colorStops)) {
      this.setState({ customColorRamp: colorStops });
      return;
    }

    this.props.onChange({
      customColorRamp: _.sortBy(colorStops, 'stop')
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
          <EuiColorStops
            label={i18n.translate('xpack.maps.style.colorRampStopsLabel', {
              defaultMessage: 'Color ramp stops'
            })}
            colorStops={this.state.customColorRamp}
            onChange={this._onCustomColorRampChange}
            stopType="fixed"
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
