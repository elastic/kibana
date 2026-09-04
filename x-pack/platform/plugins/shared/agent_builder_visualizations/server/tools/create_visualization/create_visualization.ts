/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { getDateRange } from '@kbn/timerange';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  VISUALIZATION_ATTACHMENT_TYPE,
  isCustomContentVisualization,
  type VisualizationAttachmentData,
  type VisualizationRenderer,
} from '@kbn/agent-builder-visualizations-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import {
  ToolResultType,
  SupportedChartType,
  type VisualizationResultData,
} from '@kbn/agent-builder-common/tools/tool_result';
import {
  buildLensConfig,
  buildVegaConfig,
  selectDefaultTimeRange,
  type VisualizationConfig,
} from '@kbn/agent-builder-visualizations-server';

/**
 * Pull the prior Lens config out of an existing attachment, when it is a Lens
 * visualization. Returns null for every other renderer or unparseable data.
 *
 * Checked positively rather than as "not Vega": a custom content payload read as
 * a Lens config would be handed to the Lens builder as an existing chart.
 */
const getExistingLensConfig = (
  data: VisualizationAttachmentData | undefined
): VisualizationConfig | null => {
  if (!data || (data.renderer ?? 'lens') !== 'lens') {
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

const getExistingTemplate = (data: VisualizationAttachmentData | undefined): string | undefined => {
  if (!data || !isCustomContentVisualization(data)) {
    return undefined;
  }
  return data.visualization.template || undefined;
};

const createVisualizationSchema = z
  .object({
    query: z.string().max(2048).describe('A natural language query describing the visualization.'),
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
        '(optional) ID of an existing visualization attachment to update. The attachment must exist. Omit renderer when updating because the existing visualization determines it.'
      ),
    renderer: z
      .enum(['lens', 'vega', 'custom_content'])
      .optional()
      .describe(
        '(optional, new visualizations only) Which engine renders the visualization. Use "lens" (the default when omitted) for standard charts. Use "vega" for custom Vega-Lite visualizations — small multiples/faceting, layered or combination charts of different measures, scatter/bubble plots with an encoded size dimension, custom encodings, or when the user explicitly asks for Vega/Vega-Lite. Use "custom_content" only when neither chart grammar fits — HTML/CSS layouts such as KPI scorecards with status badges, health boards, or panels mixing narrative text with live values. Omit this field when updating an existing attachment; edits keep the existing renderer.'
      ),
    chartType: z
      .nativeEnum(SupportedChartType)
      .optional()
      .describe(
        'Required when creating a new Lens visualization. For a new Vega visualization it is an optional styling hint; omit it when no Lens chart type represents the requested form. On updates it is optional because the existing visualization provides the current form.'
      ),
    esql: z
      .string()
      .max(4096)
      .optional()
      .describe(
        '(optional) An ES|QL query. For "lens" and "vega", the tool generates the query when this is omitted. For "custom_content" it is NOT generated for you: pass a query built with the generate_esql tool when the panel needs live data, or omit it for static content. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
      ),
    time_range: z
      .object({
        from: z
          .string()
          .max(256)
          .describe(
            'Start of the time range. Use Kibana date math for relative ranges (e.g. "now-30m", "now-24h", "now-7d") or an ISO 8601 string for an absolute start.'
          ),
        to: z
          .string()
          .max(256)
          .describe(
            'End of the time range. Use "now" for the current time, or an ISO 8601 string for an absolute end.'
          ),
      })
      .check((ctx) => {
        try {
          getDateRange(ctx.value);
        } catch (err) {
          ctx.issues.push({
            code: 'custom',
            message: err instanceof Error ? err.message : 'Invalid time_range',
            input: ctx.value,
          });
        }
      })
      .optional()
      .describe(
        '(optional) Only set this when the user explicitly named a time window (e.g. "last 7 days", "May 20–24"). Do not invent a range. Omit it otherwise — create applies a data-aware default, and edits keep the existing range.'
      ),
  })
  .check((ctx) => {
    if (ctx.value.attachment_id && ctx.value.renderer) {
      ctx.issues.push({
        code: 'custom',
        message: 'renderer must be omitted when updating an existing visualization attachment.',
        input: ctx.value,
      });
    }

    // Checked positively: "not Vega" would demand a chartType for custom content too.
    const isNewLensVisualization =
      !ctx.value.attachment_id && (ctx.value.renderer ?? 'lens') === 'lens';

    if (isNewLensVisualization && !ctx.value.chartType) {
      ctx.issues.push({
        code: 'custom',
        message: 'chartType is required when creating a new Lens visualization.',
        input: ctx.value,
      });
    }
  });

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    type: ToolType.builtin,
    description: `Create or update a visualization from a natural language description. Supports BOTH standard Lens charts AND custom Vega-Lite visualizations (the Vega-Lite grammar only — NOT full Vega). Prefer this tool over telling the user a chart cannot be built whenever the request fits Lens or Vega-Lite; you do not author Vega specs by hand or ask the user to paste anything. If a request genuinely needs full Vega (custom signals/interactivity, imperative transforms, or bespoke rendering), it is not supported yet — be honest with the user and offer alternatives instead of producing a broken chart.

You choose how to render the request via the "renderer" parameter:
- "lens" (the default when omitted) for a standard Lens chart; new Lens visualizations require "chartType" (${Object.values(
      SupportedChartType
    ).join(', ')}).
- "vega" for a custom Vega-Lite specification when no Lens chart type can express the request, e.g. small multiples / faceting, layered or combination charts (bars plus an overlaid line), scatter / bubble plots with an encoded size dimension, or custom tooltips/encodings. "chartType" is optional for Vega and acts only as a styling hint.

When updating via "attachment_id", omit "renderer" because the existing visualization determines it. "chartType" is optional on updates.

Only pass "time_range" when the user explicitly named a time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise: create applies a data-aware default, and edits keep the existing range.

This tool will:
1. If attachment_id is provided, read the existing visualization from that attachment (edits keep the same renderer)
2. Generate an ES|QL query if not provided
3. Generate and validate the visualization (Lens config or Vega-Lite spec) for the chosen renderer
4. Store the result as an attachment (creating new or updating existing) for future modifications

Ground first: make sure the target index exists and every field you reference is real before calling this tool. If you omit "index" the tool auto-discovers one, but that fails when the referenced fields are invented or absent from the cluster (do NOT assume APM/metrics schemas are present). For multi-panel requests, resolve the index once up front and pass the same "index" to every call rather than firing several index-less calls in parallel.`,
    schema: createVisualizationSchema,
    tags: [],
    annotations: {
      title: 'Create Kibana Visualization',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async (
      {
        query: nlQuery,
        index,
        renderer: requestedRenderer,
        chartType,
        esql,
        attachment_id: attachmentId,
        time_range: requestedTimeRange,
      },
      { esClient, modelProvider, logger, events, attachments }
    ) => {
      try {
        // Step 1: Read any existing attachment so edits reuse its renderer + config.
        let existingData: VisualizationAttachmentData | undefined;
        if (attachmentId) {
          const existingAttachmentRecord = attachments.getAttachmentRecord(attachmentId);
          if (!existingAttachmentRecord) {
            throw new Error(`Visualization attachment "${attachmentId}" not found.`);
          }

          const latestVersion = getLatestVersion(existingAttachmentRecord);
          if (!latestVersion?.data) {
            throw new Error(
              `Visualization attachment "${attachmentId}" has no readable visualization data.`
            );
          }

          existingData = latestVersion.data as VisualizationAttachmentData;
          logger.debug(`Loaded existing visualization from attachment ${attachmentId}`);
        }

        // Step 2: Resolve the renderer from the caller's choice. Edits keep the
        // existing attachment's renderer; otherwise honor the explicit `renderer`
        // param and default to Lens (the common case) when it is omitted.
        // An attachment with no discriminator predates the renderer field and is
        // implicitly Lens, so the fallback stays Lens — but each renderer is matched
        // explicitly rather than inferred from "not Vega".
        let renderer: VisualizationRenderer;
        if (existingData) {
          renderer = existingData.renderer ?? 'lens';
        } else {
          renderer = requestedRenderer ?? 'lens';
        }

        // Step 3: Generate the spec/config for the chosen renderer and assemble
        // the unified attachment data. The chart type is kept alongside rather than
        // read back off the payload, so the tool result gets it already narrowed to
        // SupportedChartType.
        let visualizationData: VisualizationAttachmentData;
        let selectedChartTypeForResult: SupportedChartType | undefined;

        if (renderer === 'custom_content') {
          // The template is generated here rather than written by the model: the model
          // supplies plain-English intent and an optional ES|QL query, and never sees or
          // authors the markup. Same resolver the dashboard path uses.
          const resolveTemplate = createCustomContentTemplateResolver({
            modelProvider,
            esClient,
            logger,
          });
          const existingTemplate = getExistingTemplate(existingData);
          const existingEsql = existingData?.esql;
          // Sampling the schema is only worth a round trip when the query is actually
          // changing; a style-only edit refines the existing template in place.
          const isQueryChanging = esql !== undefined && esql !== existingEsql;
          const mergedEsql = esql ?? existingEsql;

          const template = await resolveTemplate({
            prompt: nlQuery,
            esqlQuery: isQueryChanging ? mergedEsql : undefined,
            existingTemplate,
            hasExistingQuery: !isQueryChanging && Boolean(mergedEsql),
          });

          visualizationData = {
            renderer: 'custom_content',
            query: nlQuery,
            visualization: { template },
            ...(mergedEsql ? { esql: mergedEsql } : {}),
          };
        } else if (renderer === 'vega') {
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
          const { selectedChartType, validatedConfig, esqlQuery } = await buildLensConfig({
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
          };
          selectedChartTypeForResult = selectedChartType;
        }

        if (requestedTimeRange) {
          visualizationData.time_range = requestedTimeRange;
        } else if (existingData?.time_range) {
          visualizationData.time_range = existingData.time_range;
        } else if (!existingData) {
          const timeRange = await selectDefaultTimeRange({
            esqlQueries: visualizationData.esql ? [visualizationData.esql] : [],
            esClient,
            logger,
          });
          if (timeRange) {
            visualizationData.time_range = { from: timeRange.from, to: timeRange.to };
          }
        }

        // Step 4: Persist as an attachment so the agent can render it inline
        // (via <render_attachment>) and update it later by id.
        const description = `Visualization: ${nlQuery.slice(0, 50)}${
          nlQuery.length > 50 ? '...' : ''
        }`;
        let resultAttachmentId: string;
        let resultVersion: number | undefined;
        try {
          if (attachmentId) {
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
        const attachmentRef = {
          attachment_id: resultAttachmentId,
          ...(resultVersion !== undefined && { version: resultVersion }),
        };

        // Custom content returns no template: it can run to several KB of markup, and
        // the agent only ever needs the attachment id to render or update it.
        const resultData: VisualizationResultData = isCustomContentVisualization(visualizationData)
          ? {
              renderer: 'custom_content',
              visualization: { prompt: nlQuery },
              ...(visualizationData.esql ? { esql: visualizationData.esql } : {}),
              ...(visualizationData.time_range && { time_range: visualizationData.time_range }),
              ...attachmentRef,
            }
          : {
              renderer: visualizationData.renderer,
              visualization: visualizationData.visualization,
              esql: visualizationData.esql,
              ...(selectedChartTypeForResult && { chart_type: selectedChartTypeForResult }),
              ...(visualizationData.time_range && { time_range: visualizationData.time_range }),
              ...attachmentRef,
            };

        return {
          results: [
            {
              type: ToolResultType.visualization,
              tool_result_id: getToolResultId(),
              data: resultData,
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
          : `Failed to ${attachmentId ? 'update' : 'create'} visualization: ${message}`;
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
