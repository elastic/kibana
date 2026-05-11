/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { panelGridSchema, sectionGridSchema } from '@kbn/dashboard-agent-common';
import type { DashboardSection } from '@kbn/dashboard-agent-common';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { z } from '@kbn/zod/v4';
import {
  getResolvedVisualizationCreationRequests,
  materializeResolvedVisualizationPanels,
} from './visualization_creation';
import { defineOperation } from './types';

export const visualizationPanelInputSchema = z.object({
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
  grid: panelGridSchema.describe(
    'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row. The dashboard is 48 columns wide. Always set x and y to place panels without gaps.'
  ),
});

export type VisualizationPanelInput = z.infer<typeof visualizationPanelInputSchema>;

export const addSectionOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_section'),
    title: z.string().describe('Section title.'),
    grid: sectionGridSchema,
    panels: z
      .array(visualizationPanelInputSchema)
      .min(1)
      .optional()
      .describe(
        'Optional inline Lens visualization panels to create inside the new section. Panel grids are section-relative.'
      ),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
    let nextSection: DashboardSection = {
      id: uuidv4(),
      title: operation.title,
      collapsed: false,
      grid: operation.grid,
      panels: [],
    };

    if (operation.panels) {
      const sectionPanels = materializeResolvedVisualizationPanels({
        resolvedRequests: getResolvedVisualizationCreationRequests({
          resolvedRequestsByOperationIndex: context.resolvedVisualizationCreationRequests,
          operationIndex,
          operationType: operation.operation,
        }),
        failures: context.failures,
      }).map(({ panel }) => panel);

      nextSection = {
        ...nextSection,
        panels: sectionPanels,
      };
    }

    return {
      ...dashboardData,
      panels: [...dashboardData.panels, nextSection],
    };
  },
});
