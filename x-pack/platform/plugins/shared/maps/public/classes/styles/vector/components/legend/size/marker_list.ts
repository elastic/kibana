/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

export interface Marker {
  svg: ReactNode;
  textY: number;
}

export class MarkerList {
  private readonly _minFontDistance;
  private readonly _maxMarker;
  private readonly _markers: Marker[] = [];

  constructor(fontSize: number, maxMarker: Marker) {
    this._minFontDistance = fontSize * 0.85;
    this._maxMarker = maxMarker;
  }

  push(marker: Marker) {
    if (marker.textY - this._maxMarker.textY < this._minFontDistance) {
      return;
    }

    if (this._markers.length === 0) {
      this._markers.push(marker);
      return;
    }

    // only push marker when there is enough vertical space to display text without collisions
    const prevMarker = this._markers[this._markers.length - 1];
    if (prevMarker.textY - marker.textY > this._minFontDistance) {
      this._markers.push(marker);
    }
  }

  getMarkers() {
    const svgs = this._markers.map((marker: Marker) => {
      return marker.svg;
    });
    return [...svgs, this._maxMarker.svg];
  }
}
