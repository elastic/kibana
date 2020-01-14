/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class BoundingBoxes1D<T> {
  private boundariesStore = new Map<number, T>();
  private lookupTable = new Map<T, [number, number]>();
  private cursor = 0;
  get totalHeight() {
    return this.cursor;
  }
  add(value: T, height: number) {
    const start = this.cursor;
    const end = start + height;
    this.cursor = end;
    this.boundariesStore.set(start, value);
    this.boundariesStore.set(end, value);
    this.lookupTable.set(value, [start, end]);
  }
  find(coordinate: number) {
    if (this.boundariesStore.has(coordinate)) {
      return this.boundariesStore.get(coordinate);
    }
    if (coordinate > this.cursor) {
      return this.boundariesStore.get(this.cursor);
    }
    const boundariesArray = Array.from(this.boundariesStore.keys());
    let lowerBound = 0;
    let upperBound = boundariesArray.length - 1;
    let match = null;
    let searchPosition;
    while (match === null && lowerBound <= upperBound) {
      searchPosition = Math.floor((lowerBound + upperBound) / 2);
      const boundaryCoord = boundariesArray[searchPosition];
      const entryKey = this.boundariesStore.get(boundaryCoord);
      if (typeof entryKey === 'undefined') {
        throw new Error('boundaryCoord has no corresponding entry');
      }
      const [lowerCoord, upperCoord] = this.lookupTable.get(entryKey) || [0, 0];
      if (lowerCoord <= coordinate && upperCoord >= coordinate) {
        match = entryKey;
      } else if (lowerCoord > coordinate) {
        upperBound = searchPosition - 1;
      } else {
        lowerBound = searchPosition + 1;
      }
    }
    return match;
  }
}
