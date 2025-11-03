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
  since: z.string().describe('ISO datetime string for the start time to fetch security updates'),
});

export const securityCatchupTool = (): BuiltinToolDefinition<typeof securityCatchupSchema> => {
  return {
    id: 'platform.catchup.security.summary',
    type: ToolType.builtin,
    description: `Orchestrates all Security CatchUp tools to provide a comprehensive security summary.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
This tool calls all security sub-tools in parallel and aggregates their results.`,
    schema: securityCatchupSchema,
    handler: async ({ since }, { runner, logger }) => {
      try {
        logger.info(`[CatchUp Agent] Security catchup tool called with since: ${since}`);

        // Call all security sub-tools in parallel
        const [attackDiscoveries, detections, cases, ruleChanges] = await Promise.all([
          runner.runTool({
            toolId: 'platform.catchup.security.attack_discoveries',
            toolParams: { since },
          }),
          runner.runTool({
            toolId: 'platform.catchup.security.detections',
            toolParams: { since },
          }),
          runner.runTool({
            toolId: 'platform.catchup.security.cases',
            toolParams: { since },
          }),
          runner.runTool({
            toolId: 'platform.catchup.security.rule_changes',
            toolParams: { since },
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
                since,
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
