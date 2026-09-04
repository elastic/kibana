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
 * A chart payload rendered by Lens or Vega. `renderer` is optional because
 * attachments created before the discriminator existed are implicitly Lens.
 *
 * `esql` is required here rather than on the union: a chart is always backed by a
 * query, and only custom content can legitimately be static.
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
 * A custom content payload: an LLM-authored HTML/Liquid template rendered in a
 * sandboxed iframe. Unlike the chart renderers this is untrusted markup rather
 * than a structured config, so consumers must reach it through the `renderer`
 * discriminator and never through a generic "render the payload" path.
 */
export interface CustomContentVisualizationAttachmentData extends VisualizationAttachmentDataBase {
  renderer: 'custom_content';
  /**
   * `height` is the size the generating model declared for the template. The panel
   * cannot measure itself (no scripting in the sandbox) and the host cannot read
   * across the opaque origin, so this estimate is the only sizing signal available.
   */
  visualization: { template: string; title?: string; height?: number };
  /** Optional: a custom content panel with no query renders static content. */
  esql?: string;
}

export type VisualizationAttachmentData =
  | ChartVisualizationAttachmentData
  | CustomContentVisualizationAttachmentData;

/** Narrows an attachment payload to the custom content member. */
export const isCustomContentVisualization = (
  data: VisualizationAttachmentData
): data is CustomContentVisualizationAttachmentData => data.renderer === 'custom_content';
