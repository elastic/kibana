/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import _ from 'lodash';
import { getComputedFieldName } from '../style_util';
import { getOrdinalColorRampStops, getColorPalette } from '../../color_utils';
import { ColorGradient } from '../../components/color_gradient';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiTextColor,
} from '@elastic/eui';
import { VectorIcon } from '../components/legend/vector_icon';
import { VECTOR_STYLES } from '../vector_style_defaults';
import { COLOR_MAP_TYPE } from '../../../../../common/constants';
import {
  isCategoricalStopsInvalid,
  getOtherCategoryLabel,
} from '../components/color/color_stops_utils';

export class DynamicColorProperty extends DynamicStyleProperty {
  syncCircleColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'circle-color', color);
    mbMap.setPaintProperty(mbLayerId, 'circle-opacity', alpha);
  }

  syncIconColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-color', color);
  }

  syncHaloBorderColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-color', color);
  }

  syncCircleStrokeWithMb(pointLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', alpha);
  }

  syncFillColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'fill-color', color);
    mbMap.setPaintProperty(mbLayerId, 'fill-opacity', alpha);
  }

  syncLineColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'line-color', color);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', alpha);
  }

  syncLabelColorWithMb(mbLayerId, mbMap, alpha) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'text-color', color);
    mbMap.setPaintProperty(mbLayerId, 'text-opacity', alpha);
  }

  syncLabelBorderColorWithMb(mbLayerId, mbMap) {
    const color = this._getMbColor();
    mbMap.setPaintProperty(mbLayerId, 'text-halo-color', color);
  }

  isOrdinal() {
    return (
      typeof this._options.type === 'undefined' || this._options.type === COLOR_MAP_TYPE.ORDINAL
    );
  }

  isCategorical() {
    return this._options.type === COLOR_MAP_TYPE.CATEGORICAL;
  }

  isCustomOrdinalColorRamp() {
    return this._options.useCustomColorRamp;
  }

  supportsFeatureState() {
    return true;
  }

  isOrdinalScaled() {
    return this.isOrdinal() && !this.isCustomOrdinalColorRamp();
  }

  isOrdinalRanged() {
    return this.isOrdinal() && !this.isCustomOrdinalColorRamp();
  }

  hasOrdinalBreaks() {
    return (this.isOrdinal() && this.isCustomOrdinalColorRamp()) || this.isCategorical();
  }

  _getMbColor() {
    const isDynamicConfigComplete =
      _.has(this._options, 'field.name') && _.has(this._options, 'color');
    if (!isDynamicConfigComplete) {
      return null;
    }

    return this._getMBDataDrivenColor({
      targetName: getComputedFieldName(this._styleName, this._options.field.name),
    });
  }

  _getMbDataDrivenOrdinalColor({ targetName }) {
    if (
      this._options.useCustomColorRamp &&
      (!this._options.customColorRamp || !this._options.customColorRamp.length)
    ) {
      return null;
    }

    const colorStops = this._getMbOrdinalColorStops();
    if (this._options.useCustomColorRamp) {
      const firstStopValue = colorStops[0];
      const lessThenFirstStopValue = firstStopValue - 1;
      return [
        'step',
        ['coalesce', ['feature-state', targetName], lessThenFirstStopValue],
        'rgba(0,0,0,0)', // MB will assign the base value to any features that is below the first stop value
        ...colorStops,
      ];
    }
    return [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', targetName], -1],
      -1,
      'rgba(0,0,0,0)',
      ...colorStops,
    ];
  }

  _getColorPaletteStops() {
    if (this._options.useCustomColorPalette && this._options.customColorPalette) {
      if (isCategoricalStopsInvalid(this._options.customColorPalette)) {
        return [];
      }

      const stops = [];
      for (let i = 1; i < this._options.customColorPalette.length; i++) {
        const config = this._options.customColorPalette[i];
        stops.push({
          stop: config.stop,
          color: config.color,
          isDefault: false,
        });
      }
      stops.push({
        stop: this._options.customColorPalette[0].stop,
        color: this._options.customColorPalette[0].color,
        isDefault: true,
      });
      return stops;
    }

    const fieldMeta = this.getFieldMeta();
    if (!fieldMeta || !fieldMeta.categories) {
      return [];
    }

    const colors = getColorPalette(this._options.color);
    if (!colors) {
      return [];
    }
    const maxLength = Math.min(colors.length, fieldMeta.categories.length + 1);

    const stops = [];
    for (let i = 0; i < maxLength; i++) {
      const isDefault = i === maxLength - 1;
      stops.push({
        stop: isDefault ? '__DEFAULT__' : fieldMeta.categories[i].key,
        isDefault: isDefault,
        color: colors[i],
      });
    }
    return stops;
  }

  _getMbDataDrivenCategoricalColor() {
    if (
      this._options.useCustomColorPalette &&
      (!this._options.customColorPalette || !this._options.customColorPalette.length)
    ) {
      return null;
    }

    const paletteStops = this._getColorPaletteStops();
    if (!paletteStops.length) {
      return null;
    }

    const mbStops = [];
    let defaultColor = null;
    for (let i = 0; i < paletteStops.length; i++) {
      const stop = paletteStops[i];
      if (stop.isDefault) {
        defaultColor = stop.color;
      } else {
        mbStops.push(stop.stop);
        mbStops.push(stop.color);
      }
    }
    if (!defaultColor) {
      return null;
    }
    mbStops.push(defaultColor); //last color is default color
    return ['match', ['get', this._options.field.name], ...mbStops];
  }

  _getMBDataDrivenColor({ targetName }) {
    if (this.isCategorical()) {
      return this._getMbDataDrivenCategoricalColor({ targetName });
    } else {
      return this._getMbDataDrivenOrdinalColor({ targetName });
    }
  }

  _getOrdinalColorStopsFromCustom() {
    return this._options.customColorRamp.reduce((accumulatedStops, nextStop) => {
      return [...accumulatedStops, nextStop.stop, nextStop.color];
    }, []);
  }

  _getMbOrdinalColorStops() {
    if (this._options.useCustomColorRamp) {
      return this._getOrdinalColorStopsFromCustom();
    } else {
      return getOrdinalColorRampStops(this._options.color);
    }
  }

  renderRangeLegendHeader() {
    if (this._options.color) {
      return <ColorGradient colorRampName={this._options.color} />;
    } else {
      return null;
    }
  }

  _renderStopIcon(color, isLinesOnly, isPointsOnly, symbolId) {
    if (this.getStyleName() === VECTOR_STYLES.LABEL_COLOR) {
      const style = { color: color };
      return (
        <EuiText size={'xs'} style={style}>
          Tx
        </EuiText>
      );
    }

    const fillColor = this.getStyleName() === VECTOR_STYLES.FILL_COLOR ? color : 'none';
    return (
      <VectorIcon
        fillColor={fillColor}
        isPointsOnly={isPointsOnly}
        isLinesOnly={isLinesOnly}
        strokeColor={color}
        symbolId={symbolId}
      />
    );
  }

  _getColorRampStops() {
    if (this._options.useCustomColorRamp && this._options.customColorRamp) {
      return this._options.customColorRamp;
    } else {
      return [];
    }
  }

  _getColorStops() {
    if (this.isOrdinal()) {
      return this._getColorRampStops();
    } else if (this.isCategorical()) {
      return this._getColorPaletteStops();
    } else {
      return [];
    }
  }

  _renderColorbreaks({ isLinesOnly, isPointsOnly, symbolId }) {
    const stops = this._getColorStops();
    return stops.map((config, index) => {
      let textValue;
      if (config.isDefault) {
        textValue = (
          <EuiText size={'xs'}>
            <EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>
          </EuiText>
        );
      } else {
        const value = this.formatField(config.stop);
        textValue = <EuiText size={'xs'}>{value}</EuiText>;
      }

      return (
        <EuiFlexItem key={index}>
          <EuiFlexGroup direction={'row'} gutterSize={'none'}>
            <EuiFlexItem>{textValue}</EuiFlexItem>
            <EuiFlexItem>
              {this._renderStopIcon(config.color, isLinesOnly, isPointsOnly, symbolId)}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    });
  }

  renderBreakedLegend({ fieldLabel, isPointsOnly, isLinesOnly, symbolId }) {
    return (
      <div>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction={'column'} gutterSize={'none'}>
          {this._renderColorbreaks({
            isPointsOnly,
            isLinesOnly,
            symbolId,
          })}
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" title={this.getDisplayStyleName()} content={fieldLabel}>
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{fieldLabel}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
