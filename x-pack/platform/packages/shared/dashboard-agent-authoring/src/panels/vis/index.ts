/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z, lazySchema } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../resolve_panel';
import { defineRequestPanelKind } from '../panel_kind';

/**
 * Lens and Vega visualization panel requests.
 *
 * A new visualization is resolved from a natural-language (or ES|QL) query via
 * `source: 'request'`; an existing one is placed with `source: 'attachment'`.
 * This module owns the Lens/Vega members of the `renderer`-discriminated content
 * union and the vis resolution-request contract. The host provides
 * the resolver that turns these requests into panel content.
 */

/**
 * Request to resolve a Lens or Vega visualization panel from a natural-language /
 * ES|QL query. This is the vis member of the panel resolution union.
 */
export interface VisPanelResolutionRequest extends PanelResolutionRequestBase {
  /**
   * Which engine renders the panel; Lens when omitted. On edits, upsert
   * sets it from the existing panel, and the resolver trusts it.
   */
  renderer?: 'lens' | 'vega';
  /** Natural language description of the desired visualization. */
  nlQuery: string;
  /** Index, alias, or datastream to target; discovered when omitted. */
  index?: string;
  /** Required for new Lens panels; optional for Vega panels and edits. */
  chartType?: SupportedChartType;
  /** ES|QL query to back the visualization; generated when omitted. */
  esql?: string;
  /** Keep the panel's existing ES|QL query and column bindings instead of regenerating them. */
  preserveESQL?: boolean;
  /** Reauthor the presentation from the chart rules instead of applying only the requested changes. */
  applyChartRules?: boolean;
}

const esqlField = lazySchema(() =>
  z
    .string()
    .max(4096)
    .optional()
    .describe(
      'Only an ES|QL query the user pasted or a query-generation tool returned; NEVER one you wrote, even if you ran it. Omit it to have the query generated from `query`.'
    )
);

const visPanelContentBaseSchema = lazySchema(() =>
  z.object({
    source: z.literal('request'),
    query: z
      .string()
      .max(2048)
      .describe(
        'What the panel shows, in plain words, not ES|QL: measure, breakdown, filters, and any requested presentation (e.g. "errors over time by service as a line chart"). Each panel is generated alone, so include every filter it needs. On an edit, only the requested change.'
      ),
    index: z
      .string()
      .max(256)
      .optional()
      .describe(
        'Index, alias, data stream, or pattern the panel queries, used verbatim (e.g. "logs-*"). Pass it whenever known: when omitted, each panel discovers its own source.'
      ),
    esql: esqlField,
    preserveESQL: z
      .boolean()
      .optional()
      .describe(
        "Existing panels only. Set true to keep the panel's ES|QL query when the edit changes only presentation (title, legend, axes, colors, number formats, thresholds) or chart type; omit it when the edit changes what the panel measures."
      ),
  })
);

/** Creates or edits a Lens panel. A new Lens panel requires the caller to choose its chart type. */
export const lensPanelContentSchema = lazySchema(() =>
  visPanelContentBaseSchema.extend({
    renderer: z
      .literal('lens')
      .optional()
      .describe(
        "Omit it: a new panel defaults to Lens, and an edit keeps the panel's own renderer (Lens or Vega)."
      ),
    chartType: z
      .nativeEnum(SupportedChartType)
      .optional()
      .describe(
        'Lens chart type. Required for a new panel; on an existing panel, omit it to keep the type or set it to change it, e.g. xy to pie. xy covers line, area and bar: name the one you want in query. Use tag_cloud only for short terms and pie for fewer than 7 slices.'
      ),
    applyChartRules: z
      .boolean()
      .optional()
      .describe(
        'Existing Lens panels only; ignored on a Vega panel. Set true to restyle the panel from the default chart rules, replacing custom styling; omit it to change only what query asks. Works with or without preserveESQL.'
      ),
  })
);

/** Creates or edits a Vega panel, which may carry the closest Lens chart type as an authoring hint. */
export const vegaPanelContentSchema = lazySchema(() =>
  visPanelContentBaseSchema.extend({
    renderer: z.literal('vega').describe('Render with Vega-Lite.'),
    chartType: z
      .nativeEnum(SupportedChartType)
      .optional()
      .describe('Closest Lens chart type, used only as an authoring hint; omit it when none fits.'),
  })
);

const isEsqlDataSourceCarrier = (carrier: unknown): boolean => {
  const dataSource = (carrier as { data_source?: { type?: unknown } } | null)?.data_source;
  return dataSource?.type === 'esql';
};

/**
 * Whether a Lens panel reads its data through ES|QL. Only those can be edited; other Lens panels
 * (data views, by reference) cannot.
 */
export const isEsqlLensPanel = ({ type, config }: AttachmentPanel): boolean => {
  if (type !== LENS_EMBEDDABLE_TYPE) {
    return false;
  }
  const { layers } = (config ?? {}) as { layers?: unknown };
  return (Array.isArray(layers) ? layers : [config]).some(isEsqlDataSourceCarrier);
};

export const lensPanelKind = defineRequestPanelKind({
  renderer: 'lens',
  embeddableType: LENS_EMBEDDABLE_TYPE,
  label: 'Lens',
  contentSchema: lensPanelContentSchema,
});

export const vegaPanelKind = defineRequestPanelKind({
  renderer: 'vega',
  embeddableType: VEGA_VIS_TYPE,
  label: 'Vega',
  contentSchema: vegaPanelContentSchema,
});
