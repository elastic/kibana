/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';

const CUSTOM_ICON_MAP = 'CUSTOM_ICON_MAP';

export class IconMapSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.customIconMap === prevState.prevPropsCustomIconMap) {
      return null;
    }

    return {
      prevPropsCustomIconMap: nextProps.customIconMap, // reset tracker to latest value
      customIconMap: nextProps.customIconMap, // reset customIconMap to latest value
    };
  }

  _onIconMapSelect = selectedValue => {
    const useCustomIconMap = selectedValue === CUSTOM_ICON_MAP;
    this.props.onChange({
      iconPaletteId: useCustomIconMap ? null : selectedValue,
      useCustomIconMap,
    });
  };

  _onCustomIconMapChange = ({ iconStops, isInvalid }) => {
    // Manage invalid custom color map in local state
    if (isInvalid) {
      this.setState({ customIconMap: iconStops });
      return;
    }

    this.props.onChange({
      useCustomIconMap: true,
      customIconMap: iconStops,
    });
  };

  _renderIconStopsInput() {
    if (!this.props.useCustomIconMap) {
      return null;
    }

    /*
    <ColorStopsCategorical
          colorStops={this.state.customColorMap}
          onChange={this._onCustomColorMapChange}
        />
        */

    return (
      <Fragment>
        <EuiSpacer size="s" />
        <div>TODO implement custom icon stops UI</div>
      </Fragment>
    );
  }

  render() {
    const iconMapOptionsWithCustom = [
      {
        value: CUSTOM_ICON_MAP,
        inputDisplay: this.props.customOptionLabel,
      },
      ...this.props.iconMapOptions,
    ];

    let valueOfSelected;
    if (this.props.useCustomIconMap) {
      valueOfSelected = CUSTOM_ICON_MAP;
    } else {
      valueOfSelected = this.props.iconMapOptions.find(
        option => option.value === this.props.iconPaletteId
      )
        ? this.props.iconPaletteId
        : '';
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={iconMapOptionsWithCustom}
          onChange={this._onIconMapSelect}
          valueOfSelected={valueOfSelected}
          hasDividers={true}
        />
        {this._renderIconStopsInput()}
      </Fragment>
    );
  }
}
