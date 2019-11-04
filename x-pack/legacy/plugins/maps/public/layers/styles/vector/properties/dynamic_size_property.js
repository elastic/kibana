/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';
import { HALF_LARGE_MAKI_ICON_SIZE, LARGE_MAKI_ICON_SIZE, SMALL_MAKI_ICON_SIZE } from '../symbol_utils';
import { vectorStyles } from '../vector_style_defaults';
import _ from 'lodash';

export class DynamicSizeProperty extends DynamicStyleProperty {

  syncHaloWidthWithMb(mbLayerId, mbMap) {
    const haloWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', haloWidth);
  }


  syncIconImageAndSizeWithMb(symbolLayerId, mbMap, symbolId) {
    if (this._isSizeDynamicConfigComplete(this._options)) {
      const iconPixels = this._options.maxSize >= HALF_LARGE_MAKI_ICON_SIZE
        ? LARGE_MAKI_ICON_SIZE
        : SMALL_MAKI_ICON_SIZE;
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', `${symbolId}-${iconPixels}`);

      const halfIconPixels = iconPixels / 2;
      const targetName = getComputedFieldName(vectorStyles.ICON_SIZE, this._options.field.name);
      // Using property state instead of feature-state because layout properties do not support feature-state
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', targetName], 0],
        0, this._options.minSize / halfIconPixels,
        1, this._options.maxSize / halfIconPixels
      ]);
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
      mbMap.setLayoutProperty(symbolLayerId, 'icon-size', null);
    }
  }

  syncCircleStrokeWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', lineWidth);
  }

  syncCircleRadiusWithMb(mbLayerId, mbMap) {
    const circleRadius = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', circleRadius);
  }

  syncLineWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'line-width', lineWidth);
  }

  _getMbSize() {
    if (this._isSizeDynamicConfigComplete(this._options)) {
      return this._getMbDataDrivenSize({
        targetName: getComputedFieldName(this._styleName, this._options.field.name),
        minSize: this._options.minSize,
        maxSize: this._options.maxSize,
      });
    }
    return null;
  }

  _getMbDataDrivenSize({ targetName, minSize, maxSize }) {
    return   [
      'interpolate',
      ['linear'],
      ['coalesce', ['feature-state', targetName], 0],
      0, minSize,
      1, maxSize
    ];
  }

  _isSizeDynamicConfigComplete() {
    if (!this._field) {
      return false;
    }
    return this._field.isValid() && _.has(this._options, 'minSize') && _.has(this._options, 'maxSize');
  }
}
