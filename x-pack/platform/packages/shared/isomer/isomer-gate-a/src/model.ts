/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What a chart showed a reader, in one shape for every source: Elastic Charts' `DebugState`, the
 * DOM Kibana renders a metric into, or an Isomer Scene. Content (strings, colors, values, order)
 * is compared exactly; geometry, where both sides have it, within a tolerance.
 */

export interface Point {
  x: number;
  y: number;
}

export interface NormalizedAxis {
  /** Where the axis is drawn, which identifies it across sources. */
  position: string;
  title?: string;
  /** Tick labels. A Scene has none: the engine chooses its ticks, as Elastic Charts does. */
  labels?: string[];
  values?: Array<number | string>;
  /** Pixel positions; only engines report them. */
  gridlines?: Point[];
}

export type SeriesMark = 'area' | 'bar' | 'line';

export interface NormalizedSeries {
  mark: SeriesMark;
  name: string;
  color: string;
  /** Values in data space, in drawing order. */
  values: Array<{ x: number | string; y: number | null }>;
  /** SVG-style paths; only engines report them. */
  paths?: string[];
}

export interface NormalizedXy {
  kind: 'xy';
  legend: Array<{ name: string; color: string }>;
  axes: NormalizedAxis[];
  series: NormalizedSeries[];
}

export interface NormalizedText {
  text: string;
  color: string;
}

export interface NormalizedTile {
  background: string;
  texts: NormalizedText[];
}

export interface NormalizedMetric {
  kind: 'metric';
  tiles: NormalizedTile[];
}

/** The chart kinds compared as named lists of flat records. */
export type RecordsKind = 'partition' | 'heatmap' | 'gauge' | 'table' | 'legacyMetric' | 'tagCloud';

/** A flat record: what one slice, cell, band, word or tile shows. */
export type NormalizedRecord = Record<string, string | number | null>;

/**
 * A chart as named lists of records, such as a partition's slices or a table's cells. Each list
 * is in a stable order its normalizer states, so sources compare item by item and field by field.
 */
export interface NormalizedRecords {
  kind: RecordsKind;
  lists: Record<string, NormalizedRecord[]>;
}

export type NormalizedChart = NormalizedXy | NormalizedMetric | NormalizedRecords;

/** Series kinds in the order normalized series list them, whatever order a source reports. */
export const SERIES_MARK_ORDER: readonly SeriesMark[] = ['area', 'bar', 'line'];
