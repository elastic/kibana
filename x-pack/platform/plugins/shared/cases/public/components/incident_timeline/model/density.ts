/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TimelineDensity {
  /** About one alert bucket per this many pixels of chart width. */
  readonly pxPerBucket: number;
  /** A row draws count cells when any bucket in the window holds more alerts than this. */
  readonly cellThreshold: number;
  /** Case markers closer than this merge into one marker with a count. */
  readonly markerMergePx: number;
  /** Points closer than this in one row are offset vertically. */
  readonly pointStackPx: number;
  /** Vertical slots a row has for offset points. */
  readonly pointStackSlots: number;
  /** Alert rows shown before "Show N more rules". */
  readonly maxAlertRows: number;
  /** Padding of the default window on each side, as a share of its span. */
  readonly windowPadRatio: number;
}

/** Every density number of the incident timeline. Tune here only. */
export const TIMELINE_DENSITY: TimelineDensity = {
  pxPerBucket: 12,
  cellThreshold: 3,
  markerMergePx: 20,
  pointStackPx: 8,
  pointStackSlots: 3,
  maxAlertRows: 12,
  windowPadRatio: 0.03,
};
