/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DynamicStyleProperty } from './dynamic_style_property';
import { getIconPalette } from '../symbol_utils';
import { assignCategoriesToPalette } from '../style_util';

export class DynamicIconProperty extends DynamicStyleProperty {
  isOrdinal() {
    return false;
  }

  isCategorical() {
    return true;
  }

  syncIconWithMb(symbolLayerId, mbMap, iconPixelSize) {
    if (this._isIconDynamicConfigComplete()) {
      console.log(this._getMbIconExpression(iconPixelSize));
      mbMap.setLayoutProperty(
        symbolLayerId,
        'icon-image',
        this._getMbIconExpression(iconPixelSize)
      );
    } else {
      mbMap.setLayoutProperty(symbolLayerId, 'icon-image', null);
    }
  }

  _getMbIconExpression(iconPixelSize) {
    const { stops, fallback } = assignCategoriesToPalette({
      categories: _.get(this.getFieldMeta(), 'categories', []),
      paletteValues: getIconPalette(this._options.iconPaletteId),
    });

    if (stops.length < 1 || !fallback) {
      //occurs when no data
      return null;
    }

    const mbStops = [];
    stops.forEach(({ stop, style }) => {
      mbStops.push(`${stop}`);
      mbStops.push(`${style}-${iconPixelSize}`);
    });
    mbStops.push(fallback); //last item is fallback style for anything that does not match provided stops
    return ['match', ['to-string', ['get', this._options.field.name]], ...mbStops];
  }

  _isIconDynamicConfigComplete() {
    return this._field && this._field.isValid() && this._options.iconPaletteId;
  }
}
