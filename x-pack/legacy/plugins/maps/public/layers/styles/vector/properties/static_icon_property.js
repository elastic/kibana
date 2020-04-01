/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticStyleProperty } from './static_style_property';
import { getMakiSymbolAnchor, getMakiIconId } from '../symbol_utils';

export class StaticIconProperty extends StaticStyleProperty {
  syncIconWithMb(symbolLayerId, mbMap, iconPixelSize) {
    const symbolId = this._options.value;
    mbMap.setLayoutProperty(symbolLayerId, 'icon-anchor', getMakiSymbolAnchor(symbolId));
    mbMap.setLayoutProperty(symbolLayerId, 'icon-image', getMakiIconId(symbolId, iconPixelSize));
  }
}
