/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which engine renders a generated visualization. Lens is the default for
 * standard charts; Vega is used for requests Lens cannot express; custom content
 * is an HTML/Liquid template for layouts neither chart grammar can express.
 */
export type VisualizationRenderer = 'lens' | 'vega' | 'custom_content';

interface VisualizationAttachmentDataBase {
  /** The display query */
  query: string;
  /** Optional time range for the visualization (e.g., { from: 'now-24h', to: 'now' }) */
  time_range?: { from: string; to: string };
}

/**
 * A chart payload rendered by Lens or Vega. `esql` is required on this member because a
 * chart is always query-backed; only custom content can be static.
 */
export interface ChartVisualizationAttachmentData extends VisualizationAttachmentDataBase {
  renderer?: 'lens' | 'vega';
  /** Visualization configuration payload. For Vega, includes a serialized spec. */
  visualization: Record<string, unknown> & { spec?: string };
  /** Optional chart type identifier (primarily used by Lens). */
  chart_type?: string;
  /** The ES|QL query backing the visualization. */
  esql: string;
}

/**
 * A custom content payload: LLM-authored HTML rendered in a sandboxed iframe. Always branch
 * on `renderer` before touching `visualization` — unlike the chart members this is markup,
 * not a config, and it is only safe in the renderer that sanitizes and sandboxes it.
 */
interface CustomContentVisualizationAttachmentData extends VisualizationAttachmentDataBase {
  renderer: 'custom_content';
  /** The model's own estimate of the content height; see `CUSTOM_CONTENT_DEFAULT_HEIGHT`. */
  visualization: { template: string; title?: string; height?: number };
  /**
   * The panel's ES|QL queries, in the order its template reads them: the first is `rows`, the others
   * `queries[1]`, `queries[2]`, ... None for a static panel. Attachments saved before a panel could
   * have several hold a single string, so read it with `readCustomContentQueries`.
   */
  esql?: string[];
}

export type VisualizationAttachmentData =
  | ChartVisualizationAttachmentData
  | CustomContentVisualizationAttachmentData;

/**
 * The renderer an attachment renders with. Attachments predating the field have none and are
 * Lens. Use this rather than defaulting inline: an inline `renderer !== 'vega' ? 'lens'`
 * check silently routes any new renderer into the Lens branch.
 */
export const getEffectiveRenderer = (data: VisualizationAttachmentData): VisualizationRenderer =>
  data.renderer ?? 'lens';

/** Narrows an attachment payload to the custom content member. */
export const isCustomContentVisualization = (
  data: VisualizationAttachmentData
): data is CustomContentVisualizationAttachmentData => data.renderer === 'custom_content';

/**
 * The queries of an attachment's `esql`, whichever shape it was saved in: a chart has one string,
 * a custom content attachment saved before a panel could have several does too, and one saved
 * since holds a list. An absent or empty value is no queries; the entries of a list are kept as
 * they are, blanks included, so each stays at its position.
 */
export const toQueryList = (esql: string | readonly string[] | undefined): string[] => {
  if (!esql) return [];
  return typeof esql === 'string' ? [esql] : [...esql];
};

/** The ES|QL queries of an attachment, in the order its template reads them. */
export const readCustomContentQueries = (data: VisualizationAttachmentData): string[] =>
  toQueryList(data.esql);
