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
    id: 'platform.catchup.security.summary',
    type: ToolType.builtin,
    description: `Orchestrates all Security CatchUp tools to provide a comprehensive security summary. Use this tool ONLY when the user asks for a general security summary or catch-up. Do NOT use this tool when the user asks about specific security topics like "attack discoveries", "detections", "cases", or "rules" - use the specific tool instead (e.g., platform.catchup.security.attack_discoveries).
    
The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
The optional 'end' parameter allows filtering to a specific date range. For example, to get updates from November 2, 2025, use start="2025-11-02T00:00:00Z" and end="2025-11-03T00:00:00Z".
This tool calls all security sub-tools in parallel and aggregates their results.`,
    schema: securityCatchupSchema,
    handler: async ({ start, end }, { runner, logger }) => {
      try {
        logger.info(
          `[CatchUp Agent] Security catchup tool called with start: ${start}, end: ${end || 'now'}`
        );

        // Build tool params with optional end parameter
        const toolParams = end ? { start, end } : { start };

        // Call all security sub-tools in parallel
        const [attackDiscoveries, detections, cases, ruleChanges] = await Promise.all([
          runner.runTool({
            toolId: 'platform.catchup.security.attack_discoveries',
            toolParams,
          }),
          runner.runTool({
            toolId: 'platform.catchup.security.detections',
            toolParams,
          }),
          runner.runTool({
            toolId: 'platform.catchup.security.cases',
            toolParams,
          }),
          runner.runTool({
            toolId: 'platform.catchup.security.rule_changes',
            toolParams,
          }),
        ]);

        // Aggregate results
        const aggregatedData = {
          attackDiscoveries: attackDiscoveries.results[0]?.data || null,
          detections: detections.results[0]?.data || null,
          cases: cases.results[0]?.data || null,
          ruleChanges: ruleChanges.results[0]?.data || null,
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
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`Error in security catchup tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`Security catchup tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error generating security summary: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'orchestrator'],
  };
};
