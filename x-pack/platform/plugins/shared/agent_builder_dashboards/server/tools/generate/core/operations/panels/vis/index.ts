/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import {
  MAX_VEGA_SPEC_LENGTH,
  VEGA_VIS_TYPE,
  type VisualizationRenderer,
} from '@kbn/agent-builder-visualizations-common';
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
 * the vis resolution-request contract. The resolver that turns these requests into
 * Lens panel content lives in `core/resolvers/vis_panel_resolver.ts`.
 */

/**
 * Request to resolve a Lens visualization panel from a natural-language / ES|QL
 * query. This is the `vis` member of the panel resolution union; the resolver
 * (see `core/resolvers/vis_panel_resolver.ts`) turns it into Lens panel content.
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
  /**
   * Which engine renders the panel. Honored when adding a new panel (defaults to
   * Lens when omitted); ignored on edits, which keep the existing panel's
   * renderer.
   */
  renderer?: VisualizationRenderer;
}

const visPanelConfigSchema = z.record(z.string().max(256), z.unknown()).check((ctx) => {
  const config = ctx.value;

  if ('visualization' in config) {
    ctx.issues.push({
      code: 'custom',
      message:
        'config looks like a whole visualization attachment. Pass only its `visualization` field (a Lens API config, or a Vega `{ spec }` config), not the entire attachment.',
      input: config,
    });
    return;
  }

  // A Vega visualization's `visualization` field is a `{ spec }` config: accept
  // it by value and bound the serialized spec, matching the attachment schema.
  if ('spec' in config) {
    const { spec } = config as { spec?: unknown };
    if (typeof spec !== 'string' || spec.length === 0) {
      ctx.issues.push({
        code: 'custom',
        message: 'Vega panel config must provide a non-empty `spec` string.',
        input: config,
      });
    } else if (spec.length > MAX_VEGA_SPEC_LENGTH) {
      ctx.issues.push({
        code: 'custom',
        message: `Vega panel \`spec\` must be at most ${MAX_VEGA_SPEC_LENGTH} characters.`,
        input: config,
      });
    }
    return;
  }

  if (!('type' in config)) {
    ctx.issues.push({
      code: 'custom',
      message:
        'config is neither a Lens API config (missing a top-level `type`) nor a Vega config (missing `spec`). Pass the `visualization` field read from a visualization attachment.',
      input: config,
    });
  }
});

/**
 * The vis variant of a `config`-source panel input, discriminated by
 * `type: 'vis'`.
 */
export const visPanelConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('vis'),
  grid: panelGridSchema,
  config: visPanelConfigSchema.describe(
    'Already-resolved visualization config, passed by value from a visualization attachment\'s `visualization` field: either a Lens API config (has a top-level `type`) or a Vega config (`{ spec }`). Do not hand-build a config for a new visualization here — use source: "request" instead.'
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
    .describe(
      'Panel type to resolve. Only "vis" is currently resolvable from a request; use "renderer" to pick Lens or Vega.'
    ),
  grid: panelGridSchema,
  query: z
    .string()
    .max(2048)
    .describe('A natural language query describing the desired visualization.'),
  renderer: z
    .enum(['lens', 'vega'])
    .optional()
    .describe(
      '(optional) Which engine renders the visualization. Use "lens" (the default when omitted) for standard charts. Use "vega" for custom Vega-Lite visualizations — small multiples/faceting, layered or combination charts, scatter/bubble plots with an encoded size dimension, custom encodings, or when the user explicitly asks for Vega/Vega-Lite. Ignored when editing an existing panel (edits keep the existing renderer).'
    ),
  index: z
    .string()
    .max(256)
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
    .max(4096)
    .optional()
    .describe(
      '(optional) A validated ES|QL query from a prior tool result or explicit user input. Omit this field when composing new visualizations — the tool generates the query from the natural language query. NEVER write or invent an ES|QL query yourself.'
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
    panelId: z.string().max(256).describe('Existing Lens panel id to update.'),
    query: z
      .string()
      .max(2048)
      .describe('A natural language query describing how to update the panel.'),
  });

export type EditPanelRequestInput = z.infer<typeof editPanelRequestInputSchema>;

/**
 * Registry entry for the `vis` panel type. A by-value (`source: 'config'`) vis
 * panel can carry either a Lens API config or a Vega `{ spec }` config, so the
 * embeddable is chosen from the config shape: a `spec` string routes to the Vega
 * embeddable, everything else stays Lens. Vis is not editable via a
 * `source: 'config'` edit (edits go through `source: 'request'`), so
 * `validateConfigEdit` is intentionally omitted.
 */
export const visPanelDefinition = definePanelType({
  embeddableType: LENS_EMBEDDABLE_TYPE,
  buildPanelContent: (config) => {
    const isVegaConfig = typeof (config as { spec?: unknown })?.spec === 'string';
    return { type: isVegaConfig ? VEGA_VIS_TYPE : LENS_EMBEDDABLE_TYPE, config };
  },
});
