/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';
import type { PanelResolutionRequestBase } from '../../../resolve_panel';

/**
 * Lens visualization panel logic.
 *
 * A visualization reaches a dashboard either via `source: 'config'` (its
 * already-resolved Lens config passed by value) or `source: 'request'` (resolved
 * from a natural-language / ES|QL query). This module owns the Lens embeddable
 * identity, the by-value config contract, the vis input schemas (add + edit), and
 * the vis resolution-request contract. The concrete resolver is host-specific and
 * lives outside `core/` (see `vis_panel_resolver.ts`).
 */

/**
 * Request to resolve a Lens visualization panel from a natural-language / ES|QL
 * query. This is the `vis` member of the panel resolution union; the host's
 * resolver (see `vis_panel_resolver.ts`) turns it into Lens panel content.
 */
export interface VisPanelResolutionRequest extends PanelResolutionRequestBase {
  type: 'vis';
  /** Natural language description of the desired visualization. */
  nlQuery: string;
  /** Index, alias, or datastream to target; discovered when omitted. */
  index?: string;
  /** Preferred chart type; the LLM suggests one when omitted. */
  chartType?: SupportedChartType;
  /** ES|QL query to back the visualization; generated when omitted. */
  esql?: string;
}

/**
 * By-value Lens panel config. Currently passed through to the embeddable
 * unvalidated; typed as an opaque record so the model supplies a config it read
 * from an existing visualization rather than hand-building one.
 */
const visPanelConfigSchema = z.record(z.string().max(256), z.unknown());

/**
 * The vis variant of a `config`-source panel input, discriminated by
 * `type: 'vis'`.
 */
export const visPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('vis'),
  grid: panelGridSchema,
  config: visPanelConfigSchema.describe(
    'Already-resolved Lens config, passed by value (e.g. read from a visualization attachment). Do not hand-build a Lens config for a new visualization here — use source: "request" instead.'
  ),
});

/**
 * A `request`-source input creates a Lens visualization from a natural-language
 * (or ES|QL) query. The inline panel resolver turns it into Lens panel content.
 */
export const panelRequestSchema = z.object({
  source: z.literal('request'),
  type: z
    .literal('vis')
    .default('vis')
    .describe('Panel type to resolve. Only "vis" (Lens) is currently resolvable from a request.'),
  grid: panelGridSchema,
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index, alias, or datastream to target. If not provided, the tool will attempt to discover the best index to use.'
    ),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) The type of chart to create as indicated by the user. If not provided, the LLM will suggest the best chart type.'
    ),
  esql: z
    .string()
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, the tool will generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export type PanelRequestInput = z.infer<typeof panelRequestSchema>;

/**
 * The vis variant of an `edit_panels` item: targets an existing Lens panel by id
 * and re-resolves its content from a natural-language query. Derived from the
 * add schema so the request shape stays in sync.
 */
export const editPanelRequestInputSchema = panelRequestSchema
  .omit({ grid: true, index: true })
  .extend({
    panelId: z.string().describe('Existing Lens panel id to update.'),
    query: z.string().describe('A natural language query describing how to update the panel.'),
  });

export type EditPanelRequestInput = z.infer<typeof editPanelRequestInputSchema>;

/**
 * Registry entry for the `vis` panel type. Vis is not editable via a
 * `source: 'config'` edit (edits go through `source: 'request'`), so
 * `validateConfigEdit` is intentionally omitted.
 */
export const visPanelDefinition = definePanelType({ embeddableType: LENS_EMBEDDABLE_TYPE });
