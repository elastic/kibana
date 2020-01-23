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

  _getPaletteStops() {
    if (this._options.useCustomIconMap && this._options.customIconStops) {
      const stops = [];
      for (let i = 1; i < this._options.customIconStops.length; i++) {
        const { stop, icon } = this._options.customIconStops[i];
        stops.push({
          stop,
          style: icon,
        });
      }

      return {
        fallback:
          this._options.customIconStops.length > 0 ? this._options.customIconStops[0].icon : null,
        stops,
      };
    }

    return assignCategoriesToPalette({
      categories: _.get(this.getFieldMeta(), 'categories', []),
      paletteValues: getIconPalette(this._options.iconPaletteId),
    });
  }

  _getMbIconExpression(iconPixelSize) {
    const { stops, fallback } = this._getPaletteStops();

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
    return this._field && this._field.isValid();
  }
}
