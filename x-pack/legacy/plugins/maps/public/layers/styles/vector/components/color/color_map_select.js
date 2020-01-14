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
  state = {
    selected: null,
  };

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
    const newProps = { useCustomColorMap };
    newProps.color = useCustomColorMap ? null : selectedValue;

    this.props.onChange({
      ...newProps,
      type: this.props.colorMapType,
    });
  };

  _onCustomColorMapChange = ({ colorStops, isInvalid }) => {
    // Manage invalid custom color map in local state
    if (isInvalid) {
      const newState = {
        customColorMap: colorStops,
      };
      this.setState(newState);
      return;
    }

    const newProps = {
      useCustomColorMap: true,
      customColorMap: colorStops,
      type: this.props.colorMapType,
    };
    this.props.onChange(newProps);
  };

  componentDidMount() {
    this._updateSelected();
  }

  componentDidUpdate() {
    this._updateSelected();
  }

  _updateSelected() {
    const { color, useCustomColorMap, colorMapOptions } = this.props;
    let valueOfSelected;
    let shouldUpdate = false;
    if (useCustomColorMap) {
      valueOfSelected = CUSTOM_COLOR_MAP;
    } else {
      if (colorMapOptions.find(option => option.value === color)) {
        valueOfSelected = color;
      } else {
        valueOfSelected = colorMapOptions[0].value;
        shouldUpdate = true;
      }
    }

    if (this.state.selected !== valueOfSelected) {
      this.setState({ selected: valueOfSelected }, () => {
        if (shouldUpdate) {
          this._onColorMapSelect(valueOfSelected);
        }
      });
    }
  }

  render() {
    let colorStopsInput;
    if (this.props.useCustomColorMap) {
      if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
        colorStopsInput = (
          <Fragment>
            <EuiSpacer size="s" />
            <ColorStopsOrdinal
              colorStops={this.state.customColorMap}
              onChange={this._onCustomColorMapChange}
            />
          </Fragment>
        );
      } else if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
        colorStopsInput = (
          <Fragment>
            <EuiSpacer size="s" />
            <ColorStopsCategorical
              colorStops={this.state.customColorMap}
              onChange={this._onCustomColorMapChange}
            />
          </Fragment>
        );
      }
    }

    const colorMapOptionsWithCustom = [
      {
        value: CUSTOM_COLOR_MAP,
        inputDisplay: this.props.customOptionLabel,
      },
      ...this.props.colorMapOptions,
    ];

    return (
      <Fragment>
        <EuiSuperSelect
          options={colorMapOptionsWithCustom}
          onChange={this._onColorMapSelect}
          valueOfSelected={this.state.selected}
          hasDividers={true}
        />
        {colorStopsInput}
      </Fragment>
    );
  }
}
