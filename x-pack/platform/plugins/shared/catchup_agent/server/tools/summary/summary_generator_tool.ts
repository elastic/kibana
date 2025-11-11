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
import { extractCorrelatedData } from './helpers/data_extraction';
import {
  buildSecuritySection,
  buildObservabilitySection,
  buildSearchSection,
  buildExternalSection,
  buildCorrelationsSection,
  buildRecommendationsSection,
  buildEntitiesSection,
} from './helpers/markdown_formatters';

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
    id: 'hackathon.catchup.summary.generator',
    type: ToolType.builtin,
    description: `Generates a unified digest from correlated catchup data. **DO NOT use this tool for simple catch-up queries.** This tool is ONLY for generating summaries AFTER you have already called the correlation engine (hackathon.catchup.correlation.engine) and have correlated data to format.

**When to use this tool:**
- ONLY after calling hackathon.catchup.correlation.engine and receiving correlated results
- When you need to format correlated data from multiple sources (Security + Observability + External) into a unified summary

**When NOT to use this tool:**
- For simple catch-up queries - use the specific summary tools instead:
  - "catch me up on security" → use hackathon.catchup.security.summary
  - "catch me up on observability" → use hackathon.catchup.observability.summary
  - "catch me up on slack" → use hackathon.catchup.external.slack
- When you don't have correlated data from the correlation engine

**Required parameter:** correlatedData (object) - Must contain correlated results from the correlation engine. This is a REQUIRED parameter - do not call this tool without it.

Output can be in markdown (human-readable) or JSON (structured) format.`,
    schema: summaryGeneratorSchema,
    handler: async ({ correlatedData, format = 'markdown' }, { logger }) => {
      try {
        // Extract and normalize all correlated data
        const {
          security,
          observability,
          search,
          external,
          correlations,
          entitiesData,
          relatedAlertsData,
        } = extractCorrelatedData(correlatedData);

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

        // Generate markdown summary using helper functions
        const {
          items: securityItems,
          criticalAlertsSection,
          entitiesSection,
        } = buildSecuritySection(security);

        const relatedAlerts = relatedAlertsData?.alerts || relatedAlertsData?.data?.alerts || [];
        const { entitySummarySection, extractedEntitiesSection } = buildEntitiesSection(
          entitiesData?.entities || entitiesData || {},
          entitiesData,
          relatedAlertsData,
          correlations,
          security.cases || {},
          observability
        );

        const observabilitySection = buildObservabilitySection(observability);
        const searchSection = buildSearchSection(search);
        const externalSection = buildExternalSection(external, correlations);
        const correlationsSection = buildCorrelationsSection(correlations, security.cases || {});
        const recommendationsSection = buildRecommendationsSection(correlations, relatedAlerts);

        let markdown = `# Elastic CatchUp Summary

## Security
${securityItems.join('\n')}${criticalAlertsSection}${entitiesSection}

${observabilitySection}${entitySummarySection}${extractedEntitiesSection}
${searchSection}
${externalSection}
## Correlations
${correlationsSection}

## Recommendations

${recommendationsSection}
`;

        // Verify Correlations section is included and add if missing
        if (!markdown.includes('## Correlations') && correlations.length > 0) {
          markdown += `\n\n## Correlations\n- **${
            correlations.length
          } correlated events found**\n- Correlation types: ${correlations
            .map((c: any) => c.match_type)
            .join(', ')}\n`;
        }

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
        logger.error(`Summary generator error: ${error}`);
        return {
          results: [createErrorResult(`Error generating summary: ${error}`)],
        };
      }
    },
    tags: ['summary', 'generator'],
  };
};
