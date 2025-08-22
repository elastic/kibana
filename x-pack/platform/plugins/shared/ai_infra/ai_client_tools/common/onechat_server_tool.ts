/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { OneChatToolWithClientCallback } from '@kbn/ai-client-tools-plugin/common/types';
export const chartTypes = [
  'bar',
  'xy',
  'pie',
  'heatmap',
  'metric',
  'gauge',
  'donut',
  'mosaic',
  'regionmap',
  'table',
  'tagcloud',
  'treemap',
] as const;

const NO_ACTIONS = [];

export const schema = z.object({
  esql: z.object({
    query: z
      .string()
      .describe(
        'The ES|QL query for this visualization. Use the "query" function to generate ES|QL first and then add it here.'
      ),
  }),
  type: z.enum(chartTypes as unknown as [string, ...string[]]).describe('The type of chart'),
  layers: z
    .object({
      xy: z
        .object({
          xAxis: z.string(),
          yAxis: z.string(),
          type: z.enum(['line', 'bar', 'area']),
        })
        .optional(),
      donut: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      metric: z.object({}).optional(),
      gauge: z.object({}).optional(),
      pie: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      heatmap: z
        .object({
          xAxis: z.string(),
          breakdown: z.string(),
        })
        .optional(),
      mosaic: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      regionmap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      table: z.object({}).optional(),
      tagcloud: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
      treemap: z
        .object({
          breakdown: z.string(),
        })
        .optional(),
    })
    .optional(),
  title: z.string().describe('An optional title for the visualization.').optional(),
});

export const addToDashboardServerSideTool: OneChatToolWithClientCallback<AddToDashboardClientToolDependencies> =
  {
    id: '.add_to_dashboard',
    name: 'add_to_dashboard',
    description:
      'Add an ES|QL visualization to the current dashboard. Pick a single chart type, and based on the chart type, the corresponding key for `layers`. E.g., when you select type:metric, fill in only layers.metric.',
    schema,
    screenDescription:
      'The user is looking at the dashboard app. Here they can add visualizations to a dashboard and save them',
    handler: async ({ indexPattern }, { modelProvider, esClient }) => {
      // const indices = await esClient.asCurrentUser.cat.indices({ index: indexPattern });

      // const model = await modelProvider.getDefaultModel();
      // const response = await model.inferenceClient.chatComplete(somethingWith(indices));

      // return response;
      return [];
    },
  };
