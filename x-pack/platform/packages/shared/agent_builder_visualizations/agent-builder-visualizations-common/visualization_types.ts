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
export interface CustomContentVisualizationAttachmentData extends VisualizationAttachmentDataBase {
  renderer: 'custom_content';
  /** The model's own estimate of the content height; see `CUSTOM_CONTENT_DEFAULT_HEIGHT`. */
  visualization: { template: string; title?: string; height?: number };
  /** Optional: a custom content panel with no query renders static content. */
  esql?: string;
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
