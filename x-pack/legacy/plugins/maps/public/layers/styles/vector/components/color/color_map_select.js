/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';
import { ColorStopsOrdinal } from './color_stops_ordinal';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';
import { ColorStopsCategorical } from './color_stops_categorical';

const CUSTOM_COLOR_MAP = 'CUSTOM_COLOR_MAP';

export class ColorMapSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.customColorMap === prevState.prevPropsCustomColorMap) {
      return null;
    }

    return {
      prevPropsCustomColorMap: nextProps.customColorMap, // reset tracker to latest value
      customColorMap: nextProps.customColorMap, // reset customColorMap to latest value
    };
  }

  _onColorMapSelect = selectedValue => {
    const useCustomColorMap = selectedValue === CUSTOM_COLOR_MAP;
    this.props.onChange({
      color: useCustomColorMap ? null : selectedValue,
      useCustomColorMap,
      type: this.props.colorMapType,
    });
  };

  _onCustomColorMapChange = ({ colorStops, isInvalid }) => {
    // Manage invalid custom color map in local state
    if (isInvalid) {
      this.setState({ customColorMap: colorStops });
      return;
    }

    this.props.onChange({
      useCustomColorMap: true,
      customColorMap: colorStops,
      type: this.props.colorMapType,
    });
  };

  _renderColorStopsInput() {
    if (!this.props.useCustomColorMap) {
      return null;
    }

    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      return (
        <Fragment>
          <EuiSpacer size="s" />
          <ColorStopsOrdinal
            colorStops={this.state.customColorMap}
            onChange={this._onCustomColorMapChange}
          />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiSpacer size="s" />
        <ColorStopsCategorical
          colorStops={this.state.customColorMap}
          field={this.props.styleProperty.getField()}
          getValueSuggestions={this.props.styleProperty.getValueSuggestions}
          onChange={this._onCustomColorMapChange}
        />
      </Fragment>
    );
  }

  render() {
    const colorMapOptionsWithCustom = [
      {
        value: CUSTOM_COLOR_MAP,
        inputDisplay: this.props.customOptionLabel,
      },
      ...this.props.colorMapOptions,
    ];

    let valueOfSelected;
    if (this.props.useCustomColorMap) {
      valueOfSelected = CUSTOM_COLOR_MAP;
    } else {
      valueOfSelected = this.props.colorMapOptions.find(option => option.value === this.props.color)
        ? this.props.color
        : '';
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={colorMapOptionsWithCustom}
          onChange={this._onColorMapSelect}
          valueOfSelected={valueOfSelected}
          hasDividers={true}
        />
        {this._renderColorStopsInput()}
      </Fragment>
    );
  }
}
