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
  getEffectiveRenderer,
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
  generateVisualizationEsql,
  selectDefaultTimeRange,
  type VisualizationConfig,
} from '@kbn/agent-builder-visualizations-server';

/**
 * Pull the prior Lens config out of an existing attachment, when it is a Lens
 * visualization. Returns null for every other renderer or unparseable data — a custom
 * content payload read as a Lens config would reach the Lens builder as an existing chart.
 */
const getExistingLensConfig = (
  data: VisualizationAttachmentData | undefined
): VisualizationConfig | null => {
  if (!data || getEffectiveRenderer(data) !== 'lens') {
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

const CUSTOM_CONTENT_ESQL_INSTRUCTIONS =
  'The query results feed an HTML template that can only loop over the returned rows — it cannot aggregate, group, or sort them. Any grouping or aggregation the content needs must happen in the query itself (STATS ... BY ...), and rows should come back already sorted and limited to what the panel will display.';

const getExistingTemplate = (data: VisualizationAttachmentData | undefined): string | undefined => {
  if (!data || !isCustomContentVisualization(data)) {
    return undefined;
  }
  return data.visualization.template || undefined;
};

const ESQL_SOURCE_RULE =
  'Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.';

const chartEsqlField = z
  .string()
  .max(4096)
  .optional()
  .describe(
    `(optional) An ES|QL query. The tool generates one when this is omitted. ${ESQL_SOURCE_RULE}`
  );

const requiredChartTypeField = z
  .nativeEnum(SupportedChartType)
  .describe(
    'The Lens chart type that best fits the request. Required for a new Lens visualization.'
  );

const optionalChartTypeField = z
  .nativeEnum(SupportedChartType)
  .optional()
  .describe(
    '(optional) A Lens chart type used only as a styling hint. Omit it when no Lens chart type represents the requested form.'
  );

const lensTargetSchema = z.object({
  type: z.literal('lens').describe('A new standard Lens chart (the common case).'),
  chartType: requiredChartTypeField,
  esql: chartEsqlField,
});

const vegaTargetSchema = z.object({
  type: z
    .literal('vega')
    .describe(
      'A new custom Vega-Lite visualization, when Lens cannot express the request — small multiples/faceting, layered or combination charts of different measures, scatter/bubble plots with an encoded size dimension, custom encodings — or when the user explicitly asks for Vega/Vega-Lite.'
    ),
  chartType: optionalChartTypeField,
  esql: chartEsqlField,
});

const customContentTargetSchema = z.object({
  type: z
    .literal('custom_content')
    .describe(
      'A new HTML/CSS layout, as a last resort when neither chart grammar fits — KPI scorecards with status badges, health boards, panels mixing narrative text with live values. The markup is generated server-side from "query"; never author it yourself.'
    ),
  esql: z
    .string()
    .max(4096)
    .nullable()
    .optional()
    .describe(
      `(optional) What feeds the panel. A string: use this ES|QL query as-is (${ESQL_SOURCE_RULE}). Omitted: the tool generates a query from "query". null: the panel has no data at all — a banner, a legend, an explanatory note — and no query is generated. Never pass null to get past a failed query generation; fix the index or fields and retry instead.`
    ),
});

const attachmentTargetSchema = z.object({
  type: z
    .literal('attachment')
    .describe(
      'Update an existing visualization attachment in place. The attachment must exist; edits keep its renderer.'
    ),
  attachment_id: z.string().max(256).describe('ID of the visualization attachment to update.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe(
      '(optional) For Lens visualizations only: pass a new chart type when the request changes the chart family (e.g. xy to pie). Omit it to keep the current one.'
    ),
  esql: z
    .string()
    .max(4096)
    .nullable()
    .optional()
    .describe(
      `(optional) A string replaces the visualization's query (${ESQL_SOURCE_RULE}). Omitted: Lens and Vega edits derive the query from "query"; custom content edits keep the panel's existing query, or stay data-free when it has none. null: custom content only — drop the query so the panel becomes data-free.`
    ),
});

const targetSchema = z
  .discriminatedUnion('type', [
    lensTargetSchema,
    vegaTargetSchema,
    customContentTargetSchema,
    attachmentTargetSchema,
  ])
  .describe(
    'What to build, discriminated by "type": a new "lens", "vega" or "custom_content" visualization, or an "attachment" update of an existing one. Each type accepts only the fields that apply to it.'
  );

const createVisualizationSchema = z.object({
  query: z.string().max(2048).describe('A natural language query describing the visualization.'),
  index: z
    .string()
    .max(1024)
    .optional()
    .describe(
      '(strongly recommended) Index, alias, or datastream to target, grounded against the actual cluster. If omitted, the tool auto-discovers an index from the query, which FAILS when the referenced fields do not exist in any index. Prefer discovering the index (and verifying the fields exist) first, then pass it here — especially for multi-panel requests, where every call should reuse the same grounded index.'
    ),
  target: targetSchema,
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
});

type CreateVisualizationTarget = z.output<typeof targetSchema>;

/**
 * Flattens the discriminated `target` into the handful of values the handler works with.
 * `esql` keeps `null` (an explicit "no data" request) distinct from `undefined` (nothing said).
 */
const readTarget = (target: CreateVisualizationTarget) => ({
  attachmentId: target.type === 'attachment' ? target.attachment_id : undefined,
  requestedRenderer: target.type === 'attachment' ? undefined : target.type,
  chartType: target.type === 'custom_content' ? undefined : target.chartType,
  esql: target.esql,
});

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    type: ToolType.builtin,
    description: `Create or update a visualization from a natural language description. Supports BOTH standard Lens charts AND custom Vega-Lite visualizations (the Vega-Lite grammar only — NOT full Vega). Prefer this tool over telling the user a chart cannot be built whenever the request fits Lens or Vega-Lite; you do not author Vega specs by hand or ask the user to paste anything. If a request genuinely needs full Vega (custom signals/interactivity, imperative transforms, or bespoke rendering), it is not supported yet — be honest with the user and offer alternatives instead of producing a broken chart.

You say what to build via "target", discriminated by "target.type":
- "lens" for a standard Lens chart; requires "chartType" (${Object.values(SupportedChartType).join(
      ', '
    )}).
- "vega" for a custom Vega-Lite specification when no Lens chart type can express the request, e.g. small multiples / faceting, layered or combination charts (bars plus an overlaid line), scatter / bubble plots with an encoded size dimension, or custom tooltips/encodings. "chartType" is optional for Vega and acts only as a styling hint.
- "custom_content" for an HTML/CSS layout neither chart grammar can express — a KPI scorecard with status badges, a health or status board, a panel mixing narrative text with live values. The HTML is generated server-side from your natural-language "query"; never author markup yourself. Pass "esql": null only when the panel genuinely has no data (a banner, a legend, a note); otherwise omit "esql" and a query is generated.
- "attachment" with "attachment_id" to update an existing visualization; edits keep its renderer. "chartType" is optional on updates.

Only pass "time_range" when the user explicitly named a time window (e.g. "last 7 days", "May 20–24"). Do not set it otherwise: create applies a data-aware default, and edits keep the existing range.

This tool will:
1. If attachment_id is provided, read the existing visualization from that attachment (edits keep the same renderer)
2. Generate an ES|QL query if not provided
3. Generate and validate the visualization (Lens config, Vega-Lite spec, or custom content HTML template) for the chosen renderer
4. Store the result as an attachment (creating new or updating existing) for future modifications

Ground first: make sure the target index exists and every field you reference is real before calling this tool. If you omit "index" the tool auto-discovers one, but that fails when the referenced fields are invented or absent from the cluster (do NOT assume APM/metrics schemas are present). For multi-panel requests, resolve the index once up front and pass the same "index" to every call rather than firing several index-less calls in parallel.`,
    schema: createVisualizationSchema,
    tags: [],
    excludeFromMcp: true,
    annotations: {
      title: 'Create Kibana Visualization',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async (
      { query: nlQuery, index, target, time_range: requestedTimeRange },
      { esClient, modelProvider, logger, events, attachments }
    ) => {
      const { attachmentId, requestedRenderer, chartType, esql } = readTarget(target);
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

        // Step 2: Resolve the renderer. Edits keep the existing attachment's renderer;
        // otherwise the target type names it.
        const renderer: VisualizationRenderer = existingData
          ? getEffectiveRenderer(existingData)
          : requestedRenderer ?? 'lens';

        // `null` is the agent's explicit "this panel has no data"; only custom content can be data-free.
        if (esql === null && renderer !== 'custom_content') {
          throw new Error(
            '"esql": null only applies to custom content panels. Lens and Vega visualizations always need a query; omit "esql" to have one derived from "query".'
          );
        }

        // Step 3: Generate the spec/config for the chosen renderer and assemble the
        // unified attachment data.
        let visualizationData: VisualizationAttachmentData;
        let selectedChartTypeForResult: SupportedChartType | undefined;

        if (renderer === 'custom_content') {
          // The model supplies intent, never markup. Same resolver the dashboard uses.
          const resolveTemplate = createCustomContentTemplateResolver({
            modelProvider,
            esClient,
            logger,
          });
          const existingTemplate = getExistingTemplate(existingData);
          const existingEsql = existingData?.esql;

          // The agent decides whether the panel has data. `null` asks for none, a string
          // supplies the query, and omitting it keeps an existing panel as it is — so a
          // wording tweak can neither invent a query nor drop one. Only a brand-new panel
          // with nothing said gets a generated query.
          let mergedEsql: string | undefined;
          if (esql === null) {
            mergedEsql = undefined;
          } else if (esql !== undefined) {
            mergedEsql = esql;
          } else if (existingData) {
            mergedEsql = existingEsql;
          } else {
            const generated = await generateVisualizationEsql({
              nlQuery,
              index,
              modelProvider,
              events,
              logger,
              esClient,
              ...(requestedTimeRange ? { timeRange: requestedTimeRange } : {}),
              extraInstructions: CUSTOM_CONTENT_ESQL_INSTRUCTIONS,
            });
            if (!generated.query) {
              throw new Error(
                `Could not generate an ES|QL query for this panel: ${
                  generated.error ?? 'no query was produced'
                }. Pass an explicit "esql" built with the ES|QL tools, or "esql": null only if the panel genuinely has no data.`
              );
            }
            mergedEsql = generated.query;
          }

          // Sampling costs a round trip, so only when the query actually changes.
          const isQueryChanging = mergedEsql !== undefined && mergedEsql !== existingEsql;

          const { template, height } = await resolveTemplate({
            prompt: nlQuery,
            esqlQuery: isQueryChanging ? mergedEsql : undefined,
            existingTemplate,
            hasExistingQuery: !isQueryChanging && Boolean(mergedEsql),
          });

          visualizationData = {
            renderer: 'custom_content',
            query: nlQuery,
            visualization: { template, height },
            ...(mergedEsql ? { esql: mergedEsql } : {}),
          };
        } else if (renderer === 'vega') {
          const existingSpec = getExistingVegaSpec(existingData);
          const { spec, title, esqlQuery } = await buildVegaConfig({
            nlQuery,
            index,
            esql: esql ?? undefined,
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
            esql: esql ?? undefined,
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
