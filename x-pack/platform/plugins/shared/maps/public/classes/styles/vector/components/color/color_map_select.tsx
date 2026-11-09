/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import type { EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import {
  EuiSpacer,
  EuiSelect,
  EuiColorPalettePicker,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ColorStopsOrdinal } from './color_stops_ordinal';
import { COLOR_MAP_TYPE } from '../../../../../../common/constants';
import type {
  CategoryColorStop,
  OrdinalColorStop,
} from '../../../../../../common/descriptor_types';
import type { DynamicColorProperty } from '../../properties/dynamic_color_property';
import type { ColorStop } from '../../../../../../common/descriptor_types';
import { ColorStopsCategorical } from './color_stops_categorical';
import { CATEGORICAL_COLOR_PALETTES, NUMERICAL_COLOR_PALETTES } from '../../../color_palettes';

const CUSTOM_COLOR_MAP = 'CUSTOM_COLOR_MAP';

interface Props {
  colorMapType: COLOR_MAP_TYPE;
  colorPaletteId?: string;
  customColorMap?: OrdinalColorStop[] | CategoryColorStop[];
  invert: boolean;
  isCustomOnly: boolean;
  onChange: (params: {
    color?: string | null;
    customColorMap?: OrdinalColorStop[] | CategoryColorStop[];
    type: COLOR_MAP_TYPE;
    useCustomColorMap: boolean;
  }) => void;
  onColorMapTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  showColorMapTypeToggle: boolean;
  styleProperty: DynamicColorProperty;
  swatches: string[];
  useCustomColorMap: boolean;
}

interface State {
  customColorMap?: ColorStop[];
  prevPropsCustomColorMap?: OrdinalColorStop[] | CategoryColorStop[];
}

export class ColorMapSelect extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.customColorMap === prevState.prevPropsCustomColorMap) {
      return null;
    }

    return {
      prevPropsCustomColorMap: nextProps.customColorMap, // reset tracker to latest value
      customColorMap: nextProps.customColorMap, // reset customColorMap to latest value
    };
  }

  _renderColorMapToggle() {
    const options = [
      {
        value: COLOR_MAP_TYPE.ORDINAL,
        text: i18n.translate('xpack.maps.styles.dynamicColorSelect.quantitativeLabel', {
          defaultMessage: 'As number',
        }),
      },
      {
        value: COLOR_MAP_TYPE.CATEGORICAL,
        text: i18n.translate('xpack.maps.styles.dynamicColorSelect.qualitativeLabel', {
          defaultMessage: 'As category',
        }),
      },
    ];

    const selectedValue = this.props.styleProperty.isOrdinal()
      ? COLOR_MAP_TYPE.ORDINAL
      : COLOR_MAP_TYPE.CATEGORICAL;

    return (
      <EuiSelect
        options={options}
        value={selectedValue}
        onChange={this.props.onColorMapTypeChange}
        aria-label={i18n.translate(
          'xpack.maps.styles.dynamicColorSelect.qualitativeOrQuantitativeAriaLabel',
          {
            defaultMessage:
              'Choose `As number` to map by number in a color range, or `As category`to categorize by color palette.',
          }
        )}
        compressed
      />
    );
  }

  _onColorPaletteSelect = (selectedPaletteId: string) => {
    const useCustomColorMap = selectedPaletteId === CUSTOM_COLOR_MAP;
    this.props.onChange({
      color: useCustomColorMap ? null : selectedPaletteId,
      useCustomColorMap,
      type: this.props.colorMapType,
    });
  };

  _onCustomColorMapChange = ({
    colorStops,
    isInvalid,
  }: {
    colorStops: ColorStop[];
    isInvalid: boolean;
  }) => {
    // Manage invalid custom color map in local state
    if (isInvalid) {
      this.setState({ customColorMap: colorStops });
      return;
    }

    this.props.onChange({
      useCustomColorMap: true,
      customColorMap: colorStops as OrdinalColorStop[] | CategoryColorStop[],
      type: this.props.colorMapType,
    });
  };

  _renderColorStopsInput() {
    if (!this.props.isCustomOnly && !this.props.useCustomColorMap) {
      return null;
    }

    const field = this.props.styleProperty.getField();
    let colorStopEditor;
    if (this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL) {
      colorStopEditor = (
        <ColorStopsOrdinal
          colorStops={this.state.customColorMap}
          onChange={this._onCustomColorMapChange}
          swatches={this.props.swatches}
        />
      );
    } else if (field) {
      colorStopEditor = (
        <ColorStopsCategorical
          colorStops={this.state.customColorMap}
          field={field}
          getValueSuggestions={this.props.styleProperty.getValueSuggestions}
          onChange={this._onCustomColorMapChange}
          swatches={this.props.swatches}
        />
      );
    }

    return (
      <EuiFlexGroup>
        <EuiFlexItem>{colorStopEditor}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  _getColorPalettes() {
    if (this.props.colorMapType === COLOR_MAP_TYPE.CATEGORICAL) {
      return CATEGORICAL_COLOR_PALETTES;
    }

    return this.props.invert
      ? NUMERICAL_COLOR_PALETTES.map((paletteProps) => {
          return {
            ...paletteProps,
            palette: [...paletteProps.palette].reverse(),
          };
        })
      : NUMERICAL_COLOR_PALETTES;
  }

  _renderColorMapSelections() {
    if (this.props.isCustomOnly) {
      return null;
    }

    const palettesWithCustom = [
      {
        value: CUSTOM_COLOR_MAP,
        title:
          this.props.colorMapType === COLOR_MAP_TYPE.ORDINAL
            ? i18n.translate('xpack.maps.style.customColorRampLabel', {
                defaultMessage: 'Custom color ramp',
              })
            : i18n.translate('xpack.maps.style.customColorPaletteLabel', {
                defaultMessage: 'Custom color palette',
              }),
        type: 'text',
        'data-test-subj': `colorMapSelectOption_${CUSTOM_COLOR_MAP}`,
      },
      ...this._getColorPalettes(),
    ];

    const toggle = this.props.showColorMapTypeToggle ? (
      <EuiFlexItem grow={false}>{this._renderColorMapToggle()}</EuiFlexItem>
    ) : null;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize={'xs'}>
          {toggle}
          <EuiFlexItem>
            <EuiColorPalettePicker
              palettes={palettesWithCustom as EuiColorPalettePickerPaletteProps[]}
              onChange={this._onColorPaletteSelect}
              valueOfSelected={
                this.props.useCustomColorMap ? CUSTOM_COLOR_MAP : this.props.colorPaletteId
              }
              compressed
              data-test-subj={`colorMapSelect_${this.props.styleProperty.getStyleName()}`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderColorMapSelections()}
        {this._renderColorStopsInput()}
      </Fragment>
    );
  }
}
