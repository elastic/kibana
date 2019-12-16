/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticStyleProperty } from './static_style_property';

export class StaticOrientationProperty extends StaticStyleProperty {
  constructor(options, styleName) {
    if (typeof options.orientation !== 'number') {
      super({ orientation: 0 }, styleName);
    } else {
      super(options, styleName);
    }
  }

  syncIconRotationWithMb(symbolLayerId, mbMap) {
    mbMap.setLayoutProperty(symbolLayerId, 'icon-rotate', this._options.orientation);
  }
}
