/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicStyleProperty } from './dynamic_style_property';
import _ from 'lodash';
import { getComputedFieldName, getOtherCategoryLabel } from '../style_util';
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
import { Category } from '../components/legend/category';
import { COLOR_MAP_TYPE } from '../../../../../common/constants';
import { isCategoricalStopsInvalid } from '../components/color/color_stops_utils';

const EMPTY_STOPS = { stops: [], defaultColor: null };

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
      _.has(this._options, 'field.name') &&
      (_.has(this._options, 'color') || _.has(this._options, 'useCustomColorRamp'));
    if (!isDynamicConfigComplete) {
      return null;
    }

    const targetName = getComputedFieldName(this._styleName, this._options.field.name);
    if (this.isCategorical()) {
      return this._getMbDataDrivenCategoricalColor({ targetName });
    } else {
      return this._getMbDataDrivenOrdinalColor({ targetName, fieldName: this._options.field.name });
    }
  }

  _getMbDataDrivenOrdinalColor({ targetName, fieldName }) {
    if (
      this._options.useCustomColorRamp &&
      (!this._options.customColorRamp || !this._options.customColorRamp.length)
    ) {
      return null;
    }

    let colorStops;
    let getFunction;
    let propFieldName;
    if (this._style.isBackedByTileSource()) {
      const fieldMeta = this._getFieldMeta(fieldName);

      if (this._options.useCustomColorRamp) {
        getFunction = 'get';
        propFieldName = fieldName;
        colorStops = this._getMbOrdinalColorStops();

      } else {
        if (!fieldMeta) {
          return null;
        }

        colorStops = this._getMbOrdinalColorStops(fieldMeta.max - fieldMeta.min, fieldMeta.min);
        getFunction = 'get';
        propFieldName = fieldName;
      }
    } else {
      colorStops = this._getMbOrdinalColorStops();
      getFunction = 'feature-state';
      propFieldName = targetName;
    }

    // if (!colorStops) {
    //   return null;
    // }

    if (this._options.useCustomColorRamp) {
      const firstStopValue = colorStops[0];
      const lessThenFirstStopValue = firstStopValue - 1;
      return [
        'step',
        // ['coalesce', ['feature-state', targetName], lessThenFirstStopValue],
        ['coalesce', [getFunction, propFieldName], lessThenFirstStopValue],
        'rgba(0,0,0,0)', // MB will assign the base value to any features that is below the first stop value
        ...colorStops,
      ];
    } else {
      if (!colorStops) {
        return null;
      }
      return [
        'interpolate',
        ['linear'],
        // ['coalesce', ['feature-state', targetName], -1],
        ['coalesce', [getFunction, propFieldName], -1],
        -1,
        'rgba(0,0,0,0)',
        ...colorStops,
      ];
    }
  }

  _getColorPaletteStops() {
    if (this._options.useCustomColorPalette && this._options.customColorPalette) {
      if (isCategoricalStopsInvalid(this._options.customColorPalette)) {
        return EMPTY_STOPS;
      }

      const stops = [];
      for (let i = 1; i < this._options.customColorPalette.length; i++) {
        const config = this._options.customColorPalette[i];
        stops.push({
          stop: config.stop,
          color: config.color,
        });
      }

      return {
        defaultColor: this._options.customColorPalette[0].color,
        stops,
      };
    }

    const fieldMeta = this.getFieldMeta();
    if (!fieldMeta || !fieldMeta.categories) {
      return EMPTY_STOPS;
    }

    const colors = getColorPalette(this._options.colorCategory);
    if (!colors) {
      return EMPTY_STOPS;
    }

    const maxLength = Math.min(colors.length, fieldMeta.categories.length + 1);
    const stops = [];

    for (let i = 0; i < maxLength - 1; i++) {
      stops.push({
        stop: fieldMeta.categories[i].key,
        color: colors[i],
      });
    }
    return {
      stops,
      defaultColor: colors[maxLength - 1],
    };
  }

  _getMbDataDrivenCategoricalColor() {
    if (
      this._options.useCustomColorPalette &&
      (!this._options.customColorPalette || !this._options.customColorPalette.length)
    ) {
      return null;
    }

    const { stops, defaultColor } = this._getColorPaletteStops();
    if (stops.length < 1) {
      //occurs when no data
      return null;
    }

    if (!defaultColor) {
      return null;
    }

    const mbStops = [];
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const branch = `${stop.stop}`;
      if (typeof branch === 'string') {
        mbStops.push(branch);
        mbStops.push(stop.color);
      }
    }

    mbStops.push(defaultColor); //last color is default color
    return ['match', ['to-string', ['get', this._options.field.name]], ...mbStops];
  }

  _getMbOrdinalColorStops(scale, offset) {
    if (this._options.useCustomColorRamp) {
      return this._options.customColorRamp.reduce((accumulatedStops, nextStop) => {
        return [...accumulatedStops, nextStop.stop, nextStop.color];
      }, []);
    } else {
      return getOrdinalColorRampStops(this._options.color, scale, offset);
    }
  }

  renderRangeLegendHeader() {
    if (this._options.color) {
      return <ColorGradient colorRampName={this._options.color} />;
    } else {
      return null;
    }
  }

  _getColorRampStops() {
    return this._options.useCustomColorRamp && this._options.customColorRamp
      ? this._options.customColorRamp
      : [];
  }

  _getColorStops() {
    if (this.isOrdinal()) {
      return {
        stops: this._getColorRampStops(),
        defaultColor: null,
      };
    } else if (this.isCategorical()) {
      return this._getColorPaletteStops();
    } else {
      return EMPTY_STOPS;
    }
  }

  renderBreakedLegend({ fieldLabel, isPointsOnly, isLinesOnly, symbolId }) {
    const categories = [];
    const { stops, defaultColor } = this._getColorStops();
    stops.map(({ stop, color }) => {
      categories.push(
        <Category
          key={stop}
          styleName={this.getStyleName()}
          label={this.formatField(stop)}
          color={color}
          isLinesOnly={isLinesOnly}
          isPointsOnly={isPointsOnly}
          symbolId={symbolId}
        />
      );
    });

    if (defaultColor) {
      categories.push(
        <Category
          key="fallbackCategory"
          styleName={this.getStyleName()}
          label={<EuiTextColor color="secondary">{getOtherCategoryLabel()}</EuiTextColor>}
          color={defaultColor}
          isLinesOnly={isLinesOnly}
          isPointsOnly={isPointsOnly}
          symbolId={symbolId}
        />
      );
    }

    return (
      <div>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {categories}
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
