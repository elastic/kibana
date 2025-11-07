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

        // Helper function to extract and parse data from workflow tool response structure
        // Workflow tools return {results: [{data: "<json string>"}]}, we need to extract and parse
        // This function handles both:
        // 1. Workflow response structure: {results: [{data: "..."}]}
        // 2. Direct data objects (when template engine preserves objects)
        // 3. JSON strings (legacy format)
        const extractDataFromResponse = (value: any): any => {
          if (!value) return {};
          // If it's a workflow tool response structure, extract the data
          if (value.results && Array.isArray(value.results) && value.results.length > 0) {
            const data = value.results[0]?.data;
            // If data is a JSON string, parse it
            if (typeof data === 'string') {
              try {
                return JSON.parse(data);
              } catch (e) {
                logger.warn(`Failed to parse data as JSON: ${e}`);
                return {};
              }
            }
            // Otherwise, return data as-is (already an object)
            return data || {};
          }
          // If it's already a JSON string, parse it
          if (typeof value === 'string') {
            // Check if it's the "[object Object]" string (which means it was incorrectly stringified)
            if (value === '[object Object]') {
              logger.warn(
                `Received "[object Object]" string - this indicates an object was incorrectly converted to string`
              );
              return {};
            }
            try {
              return JSON.parse(value);
            } catch (e) {
              logger.warn(`Failed to parse value as JSON: ${e}`);
              return {};
            }
          }
          // Otherwise, assume it's already the data object (template engine preserved it)
          return value;
        };

        // Extract data from correlatedData, handling both direct data objects and workflow response structures
        const securityRaw = correlatedData.security_summary || {};
        const observabilityRaw = correlatedData.observability || {};
        const searchRaw = correlatedData.search || {};
        const externalRaw = correlatedData.external || {};
        const correlationsRaw = correlatedData.correlations || [];

        const security = extractDataFromResponse(securityRaw);
        const observability = extractDataFromResponse(observabilityRaw);
        const search = extractDataFromResponse(searchRaw);

        // Handle external object which may contain nested workflow responses
        const external: any = {};
        if (externalRaw && typeof externalRaw === 'object' && !Array.isArray(externalRaw)) {
          for (const [key, value] of Object.entries(externalRaw)) {
            external[key] = extractDataFromResponse(value);
          }
        } else {
          Object.assign(external, extractDataFromResponse(externalRaw));
        }

        // Handle correlations - could be array or nested in response
        let correlations: any[] = [];
        if (Array.isArray(correlationsRaw)) {
          correlations = correlationsRaw;
        } else {
          const extracted = extractDataFromResponse(correlationsRaw);
          if (Array.isArray(extracted)) {
            correlations = extracted;
          } else if (extracted && typeof extracted === 'object') {
            // Check for correlations array in various possible locations
            if (extracted.correlations && Array.isArray(extracted.correlations)) {
              correlations = extracted.correlations;
            } else if (extracted.prioritized_items && Array.isArray(extracted.prioritized_items)) {
              correlations = extracted.prioritized_items;
            }
          }
        }

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
        // Handle both original format (attackDiscoveries) and simplified format (attack_discoveries)
        const attackDiscoveries = security.attack_discoveries || security.attackDiscoveries;
        const detections = security.detections || {};
        const cases = security.cases || {};
        const ruleChanges = security.rule_changes || security.ruleChanges;

        const markdown = `# Elastic CatchUp Summary

## Security
${attackDiscoveries ? `- ${attackDiscoveries.total || 0} new attack discoveries` : ''}
${
  detections
    ? `- ${detections.total || detections.detections_total || 0} detections (${
        detections.detections_by_severity?.high || detections.by_severity?.high || 0
      } high, ${detections.detections_by_severity?.low || detections.by_severity?.low || 0} low)`
    : ''
}
${cases ? `- ${cases.total || 0} updated cases` : ''}
${ruleChanges ? `- ${ruleChanges.total || 0} rule changes` : ''}

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
${
  external.slack
    ? (() => {
        const userMentions = external.slack.userMentionMessages?.length || 0;
        const channelMessages = external.slack.channelMessages?.length || 0;
        const dmMessages = external.slack.dmMessages?.length || 0;
        const total = userMentions + channelMessages + dmMessages;
        if (total > 0) {
          return `- Slack: ${total} messages (${userMentions} mentions, ${channelMessages} channel, ${dmMessages} DMs)`;
        }
        return `- Slack: 0 messages`;
      })()
    : ''
}
${external.gmail ? `- Gmail: ${external.gmail.emails?.length || 0} emails` : ''}

## Correlations
${
  correlations.length > 0
    ? (() => {
        let correlationText = `- ${correlations.length} correlated events found\n\n`;

        // Group correlations by type
        const slackCaseCorrelations = correlations.filter(
          (c: any) => c.match_type === 'slack_case_url' && c.case && c.slack
        );
        const slackAlertCorrelations = correlations.filter(
          (c: any) => c.match_type === 'slack_alert_url' && c.alert && c.slack
        );
        const slackAttackCorrelations = correlations.filter(
          (c: any) => c.match_type === 'slack_attack_discovery_url' && c.slack
        );
        const caseAlertCorrelations = correlations.filter(
          (c: any) => c.match_type === 'exact_case_alert' && c.case
        );

        if (slackCaseCorrelations.length > 0) {
          correlationText += `### Slack Messages Linked to Cases\n`;
          for (const corr of slackCaseCorrelations) {
            const caseId = corr.case;
            const caseTitle = cases.cases?.find((c: any) => c.id === caseId)?.title || caseId;
            const slackMessages = corr.slack || [];
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || '').substring(0, 100).replace(/\n/g, ' ');
              correlationText += `- **Case**: [${caseTitle}](${
                cases.cases?.find((c: any) => c.id === caseId)?.url || ''
              })\n`;
              correlationText += `  - **Slack**: [${channel}](${permalink}) - "${textPreview}${
                textPreview.length >= 100 ? '...' : ''
              }"\n`;
            }
          }
          correlationText += '\n';
        }

        if (slackAlertCorrelations.length > 0) {
          correlationText += `### Slack Messages Linked to Alerts\n`;
          for (const corr of slackAlertCorrelations) {
            const alertId = corr.alert;
            const caseId = corr.case;
            const caseTitle = caseId
              ? cases.cases?.find((c: any) => c.id === caseId)?.title || caseId
              : 'Unknown Case';
            const slackMessages = corr.slack || [];
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || '').substring(0, 100).replace(/\n/g, ' ');
              correlationText += `- **Alert**: ${alertId} (in case: [${caseTitle}](${
                cases.cases?.find((c: any) => c.id === caseId)?.url || ''
              }))\n`;
              correlationText += `  - **Slack**: [${channel}](${permalink}) - "${textPreview}${
                textPreview.length >= 100 ? '...' : ''
              }"\n`;
            }
          }
          correlationText += '\n';
        }

        if (slackAttackCorrelations.length > 0) {
          correlationText += `### Slack Messages Linked to Attack Discoveries\n`;
          for (const corr of slackAttackCorrelations) {
            const slackMessages = corr.slack || [];
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || '').substring(0, 100).replace(/\n/g, ' ');
              correlationText += `- **Slack**: [${channel}](${permalink}) - "${textPreview}${
                textPreview.length >= 100 ? '...' : ''
              }"\n`;
            }
          }
          correlationText += '\n';
        }

        if (caseAlertCorrelations.length > 0 && slackCaseCorrelations.length === 0) {
          correlationText += `### Cases with Linked Alerts\n`;
          for (const corr of caseAlertCorrelations.slice(0, 5)) {
            const caseId = corr.case;
            const caseTitle = cases.cases?.find((c: any) => c.id === caseId)?.title || caseId;
            const caseUrl = cases.cases?.find((c: any) => c.id === caseId)?.url || '';
            correlationText += `- [${caseTitle}](${caseUrl}) - ${
              cases.cases?.find((c: any) => c.id === caseId)?.total_alerts || 0
            } alert(s)\n`;
          }
        }

        return correlationText;
      })()
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
