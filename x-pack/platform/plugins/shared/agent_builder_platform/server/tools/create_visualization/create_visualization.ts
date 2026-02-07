/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { VisualizationConfig } from './types';
import { guessChartType } from './guess_chart_type';
import { createVisualizationGraph } from './graph_lens';
import { getSchemaForChartType } from './schemas';

/** Attachment type for visualization configurations */
const VISUALIZATION_ATTACHMENT_TYPE = 'visualization';

const createVisualizationSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index, alias, or datastream to target. If not provided, the tool will attempt to discover the best index to use.'
    ),
  attachment_id: z
    .string()
    .optional()
    .describe(
      '(optional) ID of an existing visualization attachment to update. If provided, the tool will read the existing configuration and modify it based on the query.'
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
      '(optional) An ES|QL query. If not provided, tool with automatically generate the query. Only pass ES|QL queries from reliable sources (other tool calls or the user) and NEVER invent queries directly.'
    ),
});

export const createVisualizationTool = (): BuiltinToolDefinition<
  typeof createVisualizationSchema
> => {
  return {
    id: platformCoreTools.createVisualization,
    type: ToolType.builtin,
    description: `Create or update a visualization configuration based on a natural language description.

This tool will:
1. If attachment_id is provided, read the existing visualization configuration from that attachment
2. Determine the best chart type if not specified (from: ${Object.values(SupportedChartType).join(
      ', '
    )})
3. Generate an ES|QL query if not provided
4. Generate a valid visualization configuration
5. Store the result as an attachment (creating new or updating existing) for future modifications`,
    schema: createVisualizationSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ uiSettings }) => {
        const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID);
        return { status: enabled ? 'available' : 'unavailable' };
      },
    },
    tags: [],
    handler: async (
      { query: nlQuery, index, chartType, esql, attachment_id: attachmentId },
      { esClient, modelProvider, logger, events, attachments }
    ) => {
      try {
        // Step 1: Read existing configuration from attachment if provided
        let existingConfig: string | undefined;
        let parsedExistingConfig: VisualizationConfig | null = null;

        if (attachmentId) {
          const existingAttachmentRecord = attachments.getAttachmentRecord(attachmentId);
          if (existingAttachmentRecord) {
            const latestVersion = getLatestVersion(existingAttachmentRecord);
            if (latestVersion?.data) {
              parsedExistingConfig = latestVersion.data as VisualizationConfig;
              existingConfig = JSON.stringify(parsedExistingConfig);
              logger.debug(`Loaded existing visualization from attachment ${attachmentId}`);
            }
          } else {
            logger.warn(`Attachment ${attachmentId} not found, creating new visualization`);
          }
        }

        // Step 2: Determine chart type if not provided
        let selectedChartType: SupportedChartType = chartType || SupportedChartType.Metric;

        if (!chartType) {
          logger.debug('Chart type not provided, using LLM to suggest one');
          selectedChartType = await guessChartType(
            modelProvider,
            nlQuery,
            parsedExistingConfig?.type
          );
        }

        // Step 3: Generate visualization configuration using langgraph with validation retry
        const model = await modelProvider.getDefaultModel();
        const schema = getSchemaForChartType(selectedChartType);

        // Create and invoke the validation retry graph
        const graph = createVisualizationGraph(model, logger, events, esClient);

        const finalState = await graph.invoke({
          nlQuery,
          index,
          chartType: selectedChartType,
          schema,
          existingConfig,
          parsedExistingConfig,
          esqlQuery: esql || '',
          currentAttempt: 0,
          actions: [],
          validatedConfig: null,
          error: null,
        });

        const { validatedConfig, error, currentAttempt, esqlQuery } = finalState;

        if (!validatedConfig) {
          throw new Error(
            `Failed to generate valid configuration after ${currentAttempt} attempts. Last error: ${
              error || 'Unknown error'
            }`
          );
        }

        const visualizationData = {
          query: nlQuery,
          visualization: validatedConfig,
          chart_type: selectedChartType,
          esql: esqlQuery,
        };

        // Step 4: Try to store as attachment (optional - may fail if visualization type not registered)
        let resultAttachmentId: string | undefined;
        let version: number | undefined;
        let isUpdate = false;

        try {
          if (attachmentId && attachments.getAttachmentRecord(attachmentId)) {
            const updated = await attachments.update(attachmentId, {
              data: visualizationData,
              description: `Visualization: ${nlQuery.slice(0, 50)}${
                nlQuery.length > 50 ? '...' : ''
              }`,
            });
            resultAttachmentId = attachmentId;
            version = updated?.current_version ?? 1;
            isUpdate = true;
            logger.debug(`Updated visualization attachment ${attachmentId} to version ${version}`);
          } else {
            const newAttachment = await attachments.add({
              type: VISUALIZATION_ATTACHMENT_TYPE,
              data: visualizationData,
              description: `Visualization: ${nlQuery.slice(0, 50)}${
                nlQuery.length > 50 ? '...' : ''
              }`,
            });
            resultAttachmentId = newAttachment.id;
            version = newAttachment.current_version;
            logger.debug(`Created new visualization attachment ${resultAttachmentId}`);
          }
        } catch (attachmentError) {
          // Attachment creation is optional - continue without it
          logger.warn(
            `Could not create visualization attachment (type may not be registered): ${
              attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
            }`
          );
        }

        return {
          results: [
            {
              type: ToolResultType.visualization,
              tool_result_id: getToolResultId(),
              data: {
                query: nlQuery,
                visualization: validatedConfig,
                chart_type: selectedChartType,
                esql: esqlQuery,
                ...(resultAttachmentId && { attachment_id: resultAttachmentId }),
                ...(version !== undefined && { version }),
                ...(isUpdate && { is_update: isUpdate }),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in create_visualization tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create visualization: ${error.message}`,
                metadata: { nlQuery, esql, chartType },
              },
            },
          ],
        };
      }
    },
  };
};
