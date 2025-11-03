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

const summaryGeneratorSchema = z.object({
  correlatedData: z.record(z.unknown()).describe('Correlated data from correlation engine'),
  format: z
    .enum(['markdown', 'json'])
    .optional()
    .default('markdown')
    .describe('Output format: markdown or json'),
});

export const summaryGeneratorTool = (): BuiltinToolDefinition<typeof summaryGeneratorSchema> => {
  return {
    id: 'platform.catchup.summary.generator',
    type: ToolType.builtin,
    description: `Generates a unified digest from correlated catchup data.
    
Accepts correlated results from the correlation engine and generates a formatted summary.
Output can be in markdown (human-readable) or JSON (structured) format.`,
    schema: summaryGeneratorSchema,
    handler: async ({ correlatedData, format = 'markdown' }, { logger }) => {
      try {
        logger.debug(`summary generator tool called with format: ${format}`);

        const security = correlatedData.security_summary || {};
        const observability = correlatedData.observability || {};
        const search = correlatedData.search || {};
        const external = correlatedData.external || {};
        const correlations = correlatedData.correlations || [];

        if (format === 'json') {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  summary: {
                    security,
                    observability,
                    search,
                    external,
                    correlations,
                  },
                },
              },
            ],
          };
        }

        // Generate markdown summary
        const markdown = `# Elastic CatchUp Summary

## Security
${
  security.attackDiscoveries
    ? `- ${security.attackDiscoveries.total || 0} new attack discoveries`
    : ''
}
${
  security.detections
    ? `- ${security.detections.total || 0} detections (${
        security.detections.critical || 0
      } critical, ${security.detections.high || 0} high)`
    : ''
}
${security.cases ? `- ${security.cases.total || 0} updated cases` : ''}
${security.ruleChanges ? `- ${security.ruleChanges.total || 0} rule changes` : ''}

## Observability
${observability.total_alerts ? `- ${observability.total_alerts} total alerts` : ''}
${observability.open_alerts ? `- ${observability.open_alerts} open alerts` : ''}
${observability.resolved_alerts ? `- ${observability.resolved_alerts} resolved alerts` : ''}
${observability.top_services ? `- Top services: ${observability.top_services.join(', ')}` : ''}

## Search
${search.total_queries ? `- ${search.total_queries} queries` : ''}
${search.avg_ctr ? `- Average CTR: ${search.avg_ctr.toFixed(2)}%` : ''}

## External Context
${external.github ? `- GitHub: ${external.github.pull_requests?.length || 0} PRs` : ''}
${external.slack ? `- Slack: ${external.slack.slack_threads?.length || 0} threads` : ''}
${external.gmail ? `- Gmail: ${external.gmail.emails?.length || 0} emails` : ''}

## Correlations
${
  correlations.length > 0
    ? `- ${correlations.length} correlated events found`
    : '- No correlations found'
}
`;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                summary: markdown,
                format: 'markdown',
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in summary generator tool: ${error}`);
        return {
          results: [createErrorResult(`Error generating summary: ${error}`)],
        };
      }
    },
    tags: ['summary', 'generator'],
  };
};
