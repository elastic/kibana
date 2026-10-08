/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  type VisualizationAttachmentData,
  type VisualizationRenderer,
} from '@kbn/agent-builder-visualizations-common';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  buildLensConfig,
  buildVegaConfig,
  type VisualizationConfig,
} from '@kbn/agent-builder-visualizations-server';

/**
 * Pull the prior Lens config out of an existing attachment, when it is a Lens
 * visualization. Returns null for Vega attachments or unparseable data.
 */
const getExistingLensConfig = (
  data: VisualizationAttachmentData | undefined
): VisualizationConfig | null => {
  if (!data || data.renderer === 'vega') {
    return null;
  }
  const candidate = data.visualization;
  return candidate && typeof candidate === 'object' ? (candidate as VisualizationConfig) : null;
};

const getExistingVegaSpec = (data: VisualizationAttachmentData | undefined): string | undefined => {
  if (!data || data.renderer !== 'vega') {
    return undefined;
  }
  const candidate = data.visualization?.spec;
  return typeof candidate === 'string' ? candidate : undefined;
};

const createVisualizationSchema = z.object({
  query: z
    .string()
    .max(2048)
    .describe('A natural language query describing the desired visualization.'),
  index: z
    .string()
    .max(1024)
    .optional()
    .describe(
      '(strongly recommended) Index, alias, or datastream to target, grounded against the actual cluster. If omitted, the tool auto-discovers an index from the query, which FAILS when the referenced fields do not exist in any index. Prefer discovering the index (and verifying the fields exist) first, then pass it here — especially for multi-panel requests, where every call should reuse the same grounded index.'
    ),
  attachment_id: z
    .string()
    .max(256)
    .optional()
    .describe(
      '(optional) ID of an existing visualization attachment to update. If provided, the tool will read the existing configuration and modify it based on the query.'
    ),
  renderer: z
    .enum(['lens', 'vega'])
    .optional()
    .describe(
      '(optional) Which engine renders the visualization. Use "lens" (the default when omitted) for standard charts. Use "vega" for custom Vega-Lite visualizations — small multiples/faceting, layered or combination charts, scatter/bubble plots with an encoded size dimension, custom encodings, or when the user explicitly asks for Vega/Vega-Lite. Ignored when updating an existing attachment (edits keep the existing renderer).'
    ),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) Best-fitting chart type. For Lens it selects the chart type to build; for Vega it is a styling hint for the intended visual form. When "renderer" is omitted, providing chartType renders a Lens chart. Omit it if unsure.'
    ),
  esql: z
    .string()
    .max(4096)
    .optional()
    .describe(
      '(optional) An ES|QL query. If not provided, the tool will automatically generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    type: ToolType.builtin,
    description: `Create or update a visualization from a natural language description. Supports BOTH standard Lens charts AND custom Vega-Lite visualizations (the Vega-Lite grammar only — NOT full Vega). Prefer this tool over telling the user a chart cannot be built whenever the request fits Lens or Vega-Lite; you do not author Vega specs by hand or ask the user to paste anything. If a request genuinely needs full Vega (custom signals/interactivity, imperative transforms, or bespoke rendering), it is not supported yet — be honest with the user and offer alternatives instead of producing a broken chart.

You choose how to render the request via the "renderer" parameter:
- "lens" (the default when omitted) for a standard Lens chart (${Object.values(
      SupportedChartType
    ).join(', ')}).
- "vega" for a custom Vega-Lite specification when no Lens chart type can express the request, e.g. small multiples / faceting, layered or combination charts (bars plus an overlaid line), scatter / bubble plots with an encoded size dimension, or custom tooltips/encodings.

This tool will:
1. If attachment_id is provided, read the existing visualization from that attachment (edits keep the same renderer)
2. Generate an ES|QL query if not provided
3. Generate and validate the visualization (Lens config or Vega-Lite spec) for the chosen renderer
4. Store the result as an attachment (creating new or updating existing) for future modifications

Ground first: make sure the target index exists and every field you reference is real before calling this tool. If you omit "index" the tool auto-discovers one, but that fails when the referenced fields are invented or absent from the cluster (do NOT assume APM/metrics schemas are present). For multi-panel requests, resolve the index once up front and pass the same "index" to every call rather than firing several index-less calls in parallel.`,
    schema: createVisualizationSchema,
    tags: [],
    handler: async (
      {
        query: nlQuery,
        index,
        renderer: requestedRenderer,
        chartType,
        esql,
        attachment_id: attachmentId,
      },
      { esClient, modelProvider, logger, events, attachments }
    ) => {
      try {
        // Step 1: Read any existing attachment so edits reuse its renderer + config.
        let existingData: VisualizationAttachmentData | undefined;
        if (attachmentId) {
          const existingAttachmentRecord = attachments.getAttachmentRecord(attachmentId);
          if (existingAttachmentRecord) {
            const latestVersion = getLatestVersion(existingAttachmentRecord);
            if (latestVersion?.data) {
              existingData = latestVersion.data as VisualizationAttachmentData;
              logger.debug(`Loaded existing visualization from attachment ${attachmentId}`);
            }
          } else {
            logger.warn(`Attachment ${attachmentId} not found, creating new visualization`);
          }
        }

        // Step 2: Resolve the renderer from the caller's choice. Edits keep the
        // existing attachment's renderer; otherwise honor the explicit `renderer`
        // param and default to Lens (the common case) when it is omitted.
        let renderer: VisualizationRenderer;
        if (existingData) {
          renderer = existingData.renderer === 'vega' ? 'vega' : 'lens';
        } else {
          renderer = requestedRenderer ?? 'lens';
        }

        // Step 3: Generate the spec/config for the chosen renderer and assemble
        // the unified attachment data. `chart_type` is narrowed to
        // SupportedChartType so the same object also satisfies the tool result.
        let visualizationData: VisualizationAttachmentData & { chart_type?: SupportedChartType };

        if (renderer === 'vega') {
          const existingSpec = getExistingVegaSpec(existingData);
          const { spec, title, esqlQuery } = await buildVegaConfig({
            nlQuery,
            index,
            esql,
            existingSpec,
            chartType,
            modelProvider,
            logger,
            events,
            esClient,
          });
          visualizationData = {
            renderer: 'vega',
            query: nlQuery,
            visualization: { spec, ...(title ? { title } : {}) },
            esql: esqlQuery,
          };
        } else {
          const parsedExistingConfig = getExistingLensConfig(existingData);
          const existingConfig = parsedExistingConfig
            ? JSON.stringify(parsedExistingConfig)
            : undefined;
          const { selectedChartType, validatedConfig, esqlQuery, timeRange } =
            await buildLensConfig({
              nlQuery,
              index,
              chartType,
              esql,
              existingConfig,
              parsedExistingConfig,
              modelProvider,
              logger,
              events,
              esClient,
            });
          visualizationData = {
            renderer: 'lens',
            query: nlQuery,
            visualization: validatedConfig,
            chart_type: selectedChartType,
            esql: esqlQuery,
            ...(timeRange && { time_range: timeRange }),
          };
        }

        // Step 4: Persist as an attachment so the agent can render it inline
        // (via <render_attachment>) and update it later by id.
        const description = `Visualization: ${nlQuery.slice(0, 50)}${
          nlQuery.length > 50 ? '...' : ''
        }`;
        let resultAttachmentId: string;
        let resultVersion: number | undefined;
        try {
          if (attachmentId && attachments.getAttachmentRecord(attachmentId)) {
            const updated = await attachments.update(attachmentId, {
              data: visualizationData,
              description,
            });
            resultAttachmentId = attachmentId;
            resultVersion = updated?.current_version;
            logger.debug(
              `Updated visualization attachment ${attachmentId} to version ${resultVersion ?? 1}`
            );
          } else {
            const newAttachment = await attachments.add({
              type: VISUALIZATION_ATTACHMENT_TYPE,
              data: visualizationData,
              description,
            });
            resultAttachmentId = newAttachment.id;
            resultVersion = newAttachment.current_version;
            logger.debug(`Created new visualization attachment ${newAttachment.id}`);
          }
        } catch (attachmentError) {
          // Persistence failure is surfaced rather than swallowed: without an
          // attachment the agent cannot render the visualization inline or
          // update it later, so returning a "success" result would mislead it.
          const message =
            attachmentError instanceof Error ? attachmentError.message : String(attachmentError);
          logger.error(`Failed to persist visualization attachment: ${message}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to save visualization: ${message}`,
                  metadata: { nlQuery, esql, renderer, chartType },
                },
              },
            ],
          };
        }

        // Build the tool result from the attachment data, minus the echoed
        // natural-language `query` (the model already has it; the result type
        // does not carry it).
        const { query: _query, ...visualizationResult } = visualizationData;

        return {
          results: [
            {
              type: ToolResultType.visualization,
              tool_result_id: getToolResultId(),
              data: {
                ...visualizationResult,
                attachment_id: resultAttachmentId,
                ...(resultVersion !== undefined && { version: resultVersion }),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error in create_visualization tool: ${message}`);
        // Index auto-discovery only runs (and can only fail) when no `index` was
        // passed; that failure almost always means the referenced fields are not
        // grounded. Surface a concise, actionable next step at the top instead of
        // the deeply-nested "Failed to…: Failed to…: Could not discover…" chain.
        const isIndexDiscoveryFailure = !index && /suitable index/i.test(message);
        const userMessage = isIndexDiscoveryFailure
          ? `Could not find an index matching the requested fields. Discover the target index and verify the referenced fields exist (e.g. list indices and inspect the mapping), then retry create_visualization with an explicit "index". Details: ${message}`
          : `Failed to create visualization: ${message}`;
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: userMessage,
                metadata: { nlQuery, esql, renderer: requestedRenderer, chartType },
              },
            },
          ],
        };
      }
    },
  };
};
