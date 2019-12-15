/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticStyleProperty } from './static_style_property';

export class StaticColorProperty extends StaticStyleProperty {
  syncCircleColorWithMb(mbLayerId, mbMap, alpha) {
    mbMap.setPaintProperty(mbLayerId, 'circle-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'circle-opacity', alpha);
  }

  syncFillColorWithMb(mbLayerId, mbMap, alpha) {
    mbMap.setPaintProperty(mbLayerId, 'fill-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'fill-opacity', alpha);
  }

  syncIconColorWithMb(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-color', this._options.color);
  }

  syncHaloBorderColorWithMb(mbLayerId, mbMap) {
    mbMap.setPaintProperty(mbLayerId, 'icon-halo-color', this._options.color);
  }

  syncLineColorWithMb(mbLayerId, mbMap, alpha) {
    mbMap.setPaintProperty(mbLayerId, 'line-color', this._options.color);
    mbMap.setPaintProperty(mbLayerId, 'line-opacity', alpha);
  }

  syncCircleStrokeWithMb(pointLayerId, mbMap, alpha) {
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', this._options.color);
    mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', alpha);
  }
}
