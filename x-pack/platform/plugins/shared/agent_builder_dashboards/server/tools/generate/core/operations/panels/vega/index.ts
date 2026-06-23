/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../../resolve_panel';

/**
 * Vega visualization panel logic.
 *
 * Vega is a `source: 'request'`-only panel type: the agent describes a custom
 * visualization Lens cannot express (small multiples / faceting, repeated
 * layers, bespoke encodings) and the host resolver *invents* a Vega-Lite spec
 * from that description (see `vega_panel_resolver.ts`). There is no
 * `source: 'config'` authoring path — like `vis`, new content is always created
 * through a request — so this module owns only the Vega resolution-request
 * contract and the request/edit input schemas.
 *
 * A resolved Vega panel is stored in the (forthcoming) by-value Vega embeddable
 * API shape: `type: 'vega'` with `config: { title?, description?, spec }`, where
 * `spec` is the Vega/Vega-Lite spec serialized as a string. Until the dashboard
 * REST API supports this embeddable type, a temporary converter renders it as a
 * legacy visualize panel (see the common `from_attachment` converter).
 */

/**
 * Embeddable type a resolved Vega panel is stored as — the dedicated Vega
 * embeddable type (not the legacy `legacy_vis` visualize type).
 */
export const VEGA_PANEL_EMBEDDABLE_TYPE = 'vega';

/**
 * By-value Vega panel config, aligned with the forthcoming Vega embeddable API.
 * `spec` is the Vega/Vega-Lite spec serialized as a string (comments preserved,
 * matching the legacy precedent); `title`/`description` mirror other panel types.
 */
export interface VegaPanelConfig {
  title?: string;
  description?: string;
  spec: string;
}

/**
 * Request to resolve a Vega visualization panel from a natural-language
 * description (and optional ES|QL). This is the `vega` member of the panel
 * resolution union; the host's resolver authors a Kibana Vega-Lite spec from it.
 */
export interface VegaPanelResolutionRequest extends PanelResolutionRequestBase {
  type: 'vega';
  /** Natural language description of the desired custom visualization. */
  nlQuery: string;
  /** Index, alias, or datastream to target; discovered when omitted. */
  index?: string;
  /** ES|QL query to back the visualization; generated when omitted. */
  esql?: string;
}

/**
 * A `request`-source input that creates a Vega visualization from a
 * natural-language description. The inline panel resolver turns it into a
 * by-value Vega (legacy visualize) panel.
 */
export const vegaPanelRequestSchema = z.object({
  source: z.literal('request'),
  type: z
    .literal('vega')
    .describe(
      'Resolve a custom Vega-Lite visualization. Use this only when Lens (type: "vis") cannot express the request — e.g. small multiples / faceting, repeated layers, or bespoke encodings. The spec is authored from your description.'
    ),
  grid: panelGridSchema,
  query: z
    .string()
    .max(2048)
    .describe(
      'A natural language description of the desired custom visualization (e.g. "small multiples of CPU usage over time, one panel per host").'
    ),
  index: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) Index, alias, or datastream to target. If not provided, the tool will attempt to discover the best index to use.'
    ),
  esql: z
    .string()
    .max(4096)
    .optional()
    .describe(
      '(optional) An ES|QL query backing the visualization. If not provided, the tool will generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export type VegaPanelRequestInput = z.infer<typeof vegaPanelRequestSchema>;

/**
 * The vega variant of an `edit_panels` item: targets an existing Vega panel by
 * id and re-authors its spec from a natural-language description. Derived from
 * the add schema so the request shape stays in sync.
 */
export const editVegaPanelRequestInputSchema = vegaPanelRequestSchema
  .omit({ grid: true, index: true })
  .extend({
    panelId: z.string().max(256).describe('Existing Vega panel id to update.'),
    query: z
      .string()
      .max(2048)
      .describe('A natural language description of how to update the Vega visualization.'),
  });

export type EditVegaPanelRequestInput = z.infer<typeof editVegaPanelRequestInputSchema>;
