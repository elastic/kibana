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
import { MARKDOWN_EMBEDDABLE_TYPE, markdownPanelConfigInputSchema } from './panels/markdown';

/**
 * A `panelConfig` adds a panel from an already-resolved configuration passed by
 * value. It is discriminated by `type`, so each panel type can describe its own
 * `config` shape. The generation tool never reads an attachment or saved-object
 * store, so the config must be supplied directly rather than as an attachment ID.
 */
export const visPanelConfigInputSchema = z.object({
  kind: z.literal('panelConfig'),
  type: z.literal('vis'),
  grid: panelGridSchema,
  config: z
    .record(z.string().max(256), z.unknown())
    .describe(
      'Already-resolved Lens config, passed by value (e.g. read from a visualization attachment). Do not hand-build a Lens config for a new visualization here — use kind: "panelRequest" instead.'
    ),
});

export const panelConfigPanelInputSchema = z.discriminatedUnion('type', [
  visPanelConfigInputSchema,
  markdownPanelConfigInputSchema,
]);

export type PanelConfigPanelInput = z.infer<typeof panelConfigPanelInputSchema>;
export type PanelType = PanelConfigPanelInput['type'];

/** Maps a model-facing panel `type` to its embeddable type id (1:1). */
export const PANEL_TYPE_TO_EMBEDDABLE_TYPE: Record<PanelType, string> = {
  vis: LENS_EMBEDDABLE_TYPE,
  markdown: MARKDOWN_EMBEDDABLE_TYPE,
};

export const panelRequestSchema = z.object({
  kind: z.literal('panelRequest'),
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
