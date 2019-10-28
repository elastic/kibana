/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { DynamicStyleProperty } from './dynamic_style_property';
import { getComputedFieldName } from '../style_util';

export class DynamicSizeProperty extends DynamicStyleProperty {

  syncHaloWidthWithMb(mbLayerId, mbMap) {
    const haloWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', haloWidth);
  }

  syncCircleStrokeWidthWithMb(mbLayerId, mbMap) {
    const lineWidth = this._getMbSize();
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', lineWidth);
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

}
