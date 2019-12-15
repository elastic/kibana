/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticStyleProperty } from './static_style_property';
import {
  HALF_LARGE_MAKI_ICON_SIZE,
  LARGE_MAKI_ICON_SIZE,
  SMALL_MAKI_ICON_SIZE,
} from '../symbol_utils';

export class StaticSizeProperty extends StaticStyleProperty {
  constructor(options, styleName) {
    if (typeof options.size !== 'number') {
      super({ size: 1 }, styleName);
    } else {
      super(options, styleName);
    }
  }

  syncHaloWidthWithMb(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', this._options.size);
  }

  syncIconImageAndSizeWithMb(symbolLayerId, mbMap, symbolId) {
    const iconPixels =
      this._size >= HALF_LARGE_MAKI_ICON_SIZE ? LARGE_MAKI_ICON_SIZE : SMALL_MAKI_ICON_SIZE;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-image', `${symbolId}-${iconPixels}`);
    const halfIconPixels = iconPixels / 2;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-size', this._options.size / halfIconPixels);
  }

  syncCircleStrokeWidthWithMb(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', this._options.size);
  }

  syncCircleRadiusWithMb(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'circle-radius', this._options.size);
  }

  syncLineWidthWithMb(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'line-width', this._options.size);
  }
}
