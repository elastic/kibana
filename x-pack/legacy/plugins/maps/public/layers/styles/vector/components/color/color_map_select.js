/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';
import { COLOR_GRADIENTS, COLOR_PALETTES_INPUTS } from '../../../color_utils';
import { FormattedMessage } from '@kbn/i18n/react';
import { ColorStopsOrdinal } from './color_stops_ordinal';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { ColorStopsCategorical } from './color_stops_categorical';

const CUSTOM_COLOR_MAP = 'CUSTOM_COLOR_MAP';

export class ColorMapSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    let newState = null;
    if (nextProps.customColorRamp !== prevState.prevPropsCustomColorRamp) {
      newState = {
        ...{
          prevPropsCustomColorRamp: nextProps.customColorRamp, // reset tracker to latest value
          customColorRamp: nextProps.customColorRamp, // reset customColorRamp to latest value
        },
      };
    }

    if (nextProps.customColorPalette !== prevState.prevPropsCustomColorPalette) {
      if (!newState) {
        newState = {};
      }
      newState = {
        ...newState,
        ...{
          prevPropsCustomColorPalette: nextProps.customColorPalette, // reset tracker to latest value
          customColorPalette: nextProps.customColorPalette, // reset customColorRamp to latest value
        },
      };
    }

    return newState;
  }

  _onColorMapSelect = selectedValue => {
    const useCustomColorMap = selectedValue === CUSTOM_COLOR_MAP;
    const newProps = {};
    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      newProps.useCustomColorRamp = useCustomColorMap;
    } else if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
      newProps.useCustomColorPalette = useCustomColorMap;
    }
    newProps.color = useCustomColorMap ? null : selectedValue;

    this.props.onChange({
      ...newProps,
      type: this.props.colorMapType,
    });
  };

  _onCustomColorMapChange = ({ colorStops, isInvalid }) => {
    // Manage invalid custom color ramp in local state
    if (isInvalid) {
      const newState = {};
      if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
        newState.customColorRamp = colorStops;
      } else if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
        newState.customColorPalette = colorStops;
      }
      this.setState(newState);
      return;
    }

    const newProps = {};
    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      newProps.useCustomColorRamp = true;
      newProps.customColorRamp = colorStops;
    } else if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
      newProps.useCustomColorPalette = true;
      newProps.customColorPalette = colorStops;
    }
    newProps.type = this.props.colorMapType;
    this.props.onChange(newProps);
  };

  render() {
    const { color, useCustomColorRamp, useCustomColorPalette } = this.props;

    let colorStopsInput;
    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      if (useCustomColorRamp) {
        colorStopsInput = (
          <Fragment>
            <EuiSpacer size="s" />
            <ColorStopsOrdinal
              colorStops={this.state.customColorRamp}
              onChange={this._onCustomColorMapChange}
            />
          </Fragment>
        );
      }
    } else if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
      if (useCustomColorPalette) {
        colorStopsInput = (
          <Fragment>
            <EuiSpacer size="s" />
            <ColorStopsCategorical
              colorStops={this.state.customColorPalette}
              onChange={this._onCustomColorMapChange}
            />
          </Fragment>
        );
      }
    }

    let colorMapOptions;
    let valueOfSelected;
    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      colorMapOptions = [
        {
          value: CUSTOM_COLOR_MAP,
          inputDisplay: (
            <FormattedMessage
              id="xpack.maps.style.customColorRampLabel"
              defaultMessage="Custom color ramp"
            />
          ),
        },
        ...COLOR_GRADIENTS,
      ];
      if (useCustomColorRamp) {
        valueOfSelected = CUSTOM_COLOR_MAP;
      } else {
        if (colorMapOptions.find(option => option.value === color)) {
          valueOfSelected = color;
        } else {
          valueOfSelected = COLOR_GRADIENTS[0].value;
          this._onColorMapSelect(valueOfSelected);
        }
      }
    } else if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
      const customOption = {
        value: CUSTOM_COLOR_MAP,
        inputDisplay: (
          <FormattedMessage
            id="xpack.maps.style.customColorPaletteLabel"
            defaultMessage="Custom color palette"
          />
        ),
      };

      colorMapOptions = [customOption, ...COLOR_PALETTES_INPUTS];
      if (useCustomColorPalette) {
        valueOfSelected = CUSTOM_COLOR_MAP;
      } else {
        if (colorMapOptions.find(option => option.value === color)) {
          valueOfSelected = color;
        } else {
          valueOfSelected = COLOR_PALETTES_INPUTS[0].value;
          this._onColorMapSelect(valueOfSelected);
        }
      }
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={colorMapOptions}
          onChange={this._onColorMapSelect}
          valueOfSelected={valueOfSelected}
          hasDividers={true}
        />
        {colorStopsInput}
      </Fragment>
    );
  }
}

// ColorRampSelect.propTypes = {
//   color: PropTypes.string,
//   onChange: PropTypes.func.isRequired,
//   useCustomColorRamp: PropTypes.bool,
//   customColorRamp: PropTypes.array,
// };
