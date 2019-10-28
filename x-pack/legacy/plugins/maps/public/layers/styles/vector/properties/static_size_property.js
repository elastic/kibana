/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { StaticStyleProperty } from './static_style_property';


export class StaticSizeProperty extends StaticStyleProperty {

  constructor(options) {
    if (typeof options.size !== 'number') {
      super({ size: 1 });
    } else {
      super(options);
    }
  }

  syncWithMbForHaloWidth(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-width', this._options.size);
  }

  syncWithMbForCircles(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'circle-stroke-width', this._options.size);
  }

  syncWithMbForShapes(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'line-width', this._options.size);
  }


}
