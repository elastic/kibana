/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';

const observabilityCatchupSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch observability updates (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch observability updates (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
});

export const observabilityCatchupTool = (): BuiltinToolDefinition<
  typeof observabilityCatchupSchema
> => {
  return {
    id: 'hackathon.catchup.observability.summary',
    type: ToolType.builtin,
    description: `Orchestrates all Observability CatchUp tools to provide a comprehensive observability summary. Use this tool ONLY when the user asks for a general observability summary or catch-up. Do NOT use this tool when the user asks about specific observability topics like "alerts" or "cases" - use the specific tool instead (e.g., hackathon.catchup.observability.alerts).

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get updates from November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
This tool calls all observability sub-tools in parallel and aggregates their results.`,
    schema: observabilityCatchupSchema,
    handler: async ({ start, end }, { runner, logger }) => {
      try {
        // Build tool params with optional end parameter
        const toolParams = end ? { start, end } : { start };
        // Cases tool params - filter to observability cases only
        const casesToolParams = end
          ? { start, end, owner: 'observability' }
          : { start, owner: 'observability' };

        // Call all observability sub-tools in parallel
        const [alerts, cases] = await Promise.all([
          runner.runTool({
            toolId: 'hackathon.catchup.observability.alerts',
            toolParams,
          }),
          runner.runTool({
            toolId: 'hackathon.catchup.cases',
            toolParams: casesToolParams,
          }),
        ]);

        // Aggregate results - merge all result types (tabular and other)
        // For each tool, find both tabular and other results
        // The 'other' type result contains URLs and metadata, while tabular has structured data
        const getTabularResult = (toolResults: any[]) =>
          toolResults.find((r: any) => r.type === ToolResultType.tabularData)?.data || null;
        const getOtherResult = (toolResults: any[]) =>
          toolResults.find((r: any) => r.type === ToolResultType.other)?.data || null;

        // Merge tabular and other results for each tool
        const mergeToolResults = (toolResults: any[]) => {
          const tabular = getTabularResult(toolResults);
          const other = getOtherResult(toolResults);
          // If we have both, merge them; otherwise return whichever is available
          if (tabular && other) {
            return { ...tabular, ...other };
          }
          return tabular || other || null;
        };

        const aggregatedData = {
          alerts: mergeToolResults(alerts.results),
          cases: mergeToolResults(cases.results),
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                observability_summary: aggregatedData,
                start,
                end: end || null,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in observability catchup tool: ${errorMessage}`, {
          error: error instanceof Error ? error.stack : undefined,
        });
        return {
          results: [createErrorResult(`Error generating observability summary: ${errorMessage}`)],
        };
      }
    },
    tags: ['observability', 'orchestrator'],
  };
};
