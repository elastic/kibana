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

const securityCatchupSchema = z.object({
  start: z
    .string()
    .describe('ISO datetime string for the start time to fetch security updates (inclusive)'),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch security updates (exclusive). If not provided, defaults to now. Use this to filter for a specific date range (e.g., for "November 2", use start="2025-11-02T00:00:00Z" and end="2025-11-03T00:00:00Z")'
    ),
});

export const securityCatchupTool = (): BuiltinToolDefinition<typeof securityCatchupSchema> => {
  return {
    id: 'hackathon.catchup.security.summary',
    type: ToolType.builtin,
    description: `Orchestrates all Security CatchUp tools to provide a comprehensive security summary. Use this tool ONLY when the user asks for a general security summary or catch-up. Do NOT use this tool when the user asks about specific security topics like "attack discoveries", "detections", "cases", or "rules" - use the specific tool instead (e.g., hackathon.catchup.security.attack_discoveries).

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
The optional 'end' parameter allows filtering to a specific date range. For example, to get updates from November 2, 2025, use start="2025-11-02T00:00:00Z" and end="2025-11-03T00:00:00Z".
This tool calls all security sub-tools in parallel and aggregates their results.`,
    schema: securityCatchupSchema,
    handler: async ({ start, end }, { runner, logger }) => {
      try {

        // Build tool params with optional end parameter
        const toolParams = end ? { start, end } : { start };
        // Cases tool params - filter to security cases only
        const casesToolParams = end
          ? { start, end, owner: 'securitySolution' }
          : { start, owner: 'securitySolution' };

        // Call all security sub-tools in parallel
        const [attackDiscoveries, detections, cases, ruleChanges] = await Promise.all([
          runner.runTool({
            toolId: 'hackathon.catchup.security.attack_discoveries',
            toolParams,
          }),
          runner.runTool({
            toolId: 'hackathon.catchup.security.detections',
            toolParams,
          }),
          runner.runTool({
            toolId: 'hackathon.catchup.cases',
            toolParams: casesToolParams,
          }),
          runner.runTool({
            toolId: 'hackathon.catchup.security.rule_changes',
            toolParams,
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
          attackDiscoveries: mergeToolResults(attackDiscoveries.results),
          detections: mergeToolResults(detections.results),
          cases: mergeToolResults(cases.results),
          ruleChanges: mergeToolResults(ruleChanges.results),
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                security_summary: aggregatedData,
                start,
                end: end || null,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in security catchup tool: ${errorMessage}`, {
          error: error instanceof Error ? error.stack : undefined,
        });
        return {
          results: [createErrorResult(`Error generating security summary: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'orchestrator'],
  };
};
