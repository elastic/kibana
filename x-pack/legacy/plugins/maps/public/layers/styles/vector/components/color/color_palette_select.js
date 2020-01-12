/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ColorStopsCategorical } from './color_stops_categorical';
import { COLOR_PALETTES } from '../../../color_utils';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';

const CUSTOM_COLOR_PALETTE = 'CUSTOM_COLOR_PALETTE';
const CUSTOM_OPTION = {
  value: CUSTOM_COLOR_PALETTE,
  inputDisplay: (
    <FormattedMessage
      id="xpack.maps.style.customColorPaletteLabel"
      defaultMessage="Custom color palette"
    />
  ),
};

const colorPaletteInputs = COLOR_PALETTES.map(palette => {
  const paletteDisplay = palette.colors.map(color => {
    const style = {
      backgroundColor: color,
      width: '10%',
      position: 'relative',
      height: '100%',
      display: 'inline-block',
    };
    // eslint-disable-next-line react/no-danger
    return <div style={style} dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />;
  });
  return {
    value: palette.id,
    inputDisplay: <div className={'mapColorGradient'}>{paletteDisplay}</div>,
  };
});

export class ColorPaletteSelect extends Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.customColorPalette !== prevState.prevPropsCustomColorPalette) {
      return {
        prevPropsCustomColorPalette: nextProps.customColorPalette, // reset tracker to latest value
        customColorPalette: nextProps.customColorPalette, // reset customColorPalette to latest value
      };
    }

    return null;
  }

  _onColorPaletteSelect = selectedValue => {
    const useCustomColorPalette = selectedValue === CUSTOM_COLOR_PALETTE;
    this.props.onChange({
      type: COLOR_MAP_TYPE.CATEGORICAL,
      color: useCustomColorPalette ? null : selectedValue,
      useCustomColorPalette,
    });
  };

  _onCustomColorPaletteChange = ({ colorStops }) => {
    this.props.onChange({
      type: COLOR_MAP_TYPE.CATEGORICAL,
      customColorPalette: colorStops,
    });
  };

  render() {
    const {
      color,
      onChange, // eslint-disable-line no-unused-vars
      useCustomColorPalette,
      customColorPalette, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    let colorStopsInput;
    if (useCustomColorPalette) {
      colorStopsInput = (
        <Fragment>
          <EuiSpacer size="s" />
          <ColorStopsCategorical
            colorStops={this.state.customColorPalette}
            onChange={this._onCustomColorPaletteChange}
          />
        </Fragment>
      );
    }

    const colorPaletteOptions = [CUSTOM_OPTION, ...colorPaletteInputs];
    let valueOfSelected;
    if (useCustomColorPalette) {
      valueOfSelected = CUSTOM_COLOR_PALETTE;
    } else {
      if (colorPaletteOptions.find(option => option.value === color)) {
        valueOfSelected = color;
      } else {
        valueOfSelected = colorPaletteInputs[0].value;
        this._onColorPaletteSelect(valueOfSelected);
      }
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={colorPaletteOptions}
          onChange={this._onColorPaletteSelect}
          valueOfSelected={valueOfSelected}
          hasDividers={true}
          {...rest}
        />
        {colorStopsInput}
      </Fragment>
    );
  }
}

ColorPaletteSelect.propTypes = {
  color: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  useCustomColorPalette: PropTypes.bool,
  customColorPalette: PropTypes.array,
};
