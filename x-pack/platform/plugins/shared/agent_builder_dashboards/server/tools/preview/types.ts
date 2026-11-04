/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One ES|QL result, as returned by `executeEsql` with `columnMetadata`. */
export interface PreviewTable {
  columns: Array<{
    name: string;
    type: string;
    /** The interval of a `BUCKET` column, e.g. `{ interval: 3, unit: 'hour' }`. */
    _meta?: { bucket?: { interval: number; unit: string } };
  }>;
  values: unknown[][];
}

/** The fields every Lens API chart config has. */
export interface PreviewPanelConfig {
  type: string;
  title?: string;
}

/** Where region maps get their boundaries: Kibana's `map.*` settings, from the `mapsEms` plugin. */
export interface PreviewEmsSettings {
  isEnabled: boolean;
  fileApiUrl: string;
  tileApiUrl: string;
  landingPageUrl: string;
}

/** What every preview is drawn with, besides the panel config and its main query result. */
export interface PreviewContext {
  /** IANA time zone dates are shown in: Kibana's `dateFormat:tz`, or UTC when that is `Browser`. */
  timeZone: string;
  /** Kibana's `dateFormat` (moment pattern) for full dates. */
  dateFormat: string;
  /** The dashboard time range in epoch milliseconds, when it has one. */
  timeRange?: { min: number; max: number };
  /** Results of the renderer's extra queries, by name. */
  extraTables: Readonly<Record<string, PreviewTable>>;
  /** Kibana's Elastic Maps Service settings, when the `mapsEms` plugin is available. */
  ems?: PreviewEmsSettings;
}

/** Draws previews of one Lens chart type from its API config and its ES|QL data. */
export interface PanelPreviewRenderer<TConfig extends PreviewPanelConfig = PreviewPanelConfig> {
  /** The ES|QL query whose result the preview draws, or undefined when the panel has none. */
  getQuery(config: TConfig): string | undefined;
  /** Other queries the chart draws from, by name, such as the trendline of a metric. */
  getExtraQueries?(config: TConfig): Readonly<Record<string, string>>;
  /** Draws the panel as a standalone SVG document, title included. */
  renderSvg(
    config: TConfig,
    table: PreviewTable,
    context: PreviewContext
  ): string | Promise<string>;
}
