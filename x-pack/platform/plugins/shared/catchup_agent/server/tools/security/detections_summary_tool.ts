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
import { executeEsql } from '@kbn/onechat-genai-utils/tools/utils/esql';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { getSpaceId, getPluginServices } from '../../services/service_locator';
import { normalizeTimeRange } from '../utils/date_normalization';
import { getAlertsPageUrl } from '../utils/kibana_urls';

const detectionsSummarySchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to summarize detections (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to summarize detections (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
});

export const detectionsSummaryTool = (): BuiltinToolDefinition<typeof detectionsSummarySchema> => {
  return {
    id: 'hackathon.catchup.security.detections',
    type: ToolType.builtin,
    description: `Summarizes detection alerts from Elastic Security since a given timestamp.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get detections from November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
Returns aggregated statistics including total count, counts by severity, and sample alerts with entity fields (host.name, user.name, source.ip, destination.ip, etc.) prioritized by severity.`,
    schema: detectionsSummarySchema,
    handler: async ({ start, end }, { request, esClient, logger }) => {
      try {
        // Normalize and adjust time range using helper function
        const timeRange = normalizeTimeRange(start, end, { logger });

        // Get space ID from request
        const spaceId = getSpaceId(request);

        // Get authorized alerts indices from Rule Registry
        const { plugin } = getPluginServices();
        let indexPattern: string = `.alerts-security.alerts-${spaceId}*`; // Default fallback

        if (plugin.ruleRegistry) {
          try {
            const racClient = await plugin.ruleRegistry.getRacClientWithRequest(request);
            const authorizedIndices = await racClient.getAuthorizedAlertsIndices(
              SECURITY_SOLUTION_RULE_TYPE_IDS
            );

            if (authorizedIndices && authorizedIndices.length > 0) {
              // Filter out preview indices and internal indices
              const filteredIndices = authorizedIndices.filter(
                (idx: string) =>
                  !idx.includes('.preview.') &&
                  !idx.includes('.internal.') &&
                  !idx.startsWith('.internal.')
              );
              if (filteredIndices.length > 0) {
                indexPattern = filteredIndices.join(',');
              }
            }
          } catch (error) {
            logger.warn(
              `[CatchUp Agent] Failed to get authorized indices from Rule Registry: ${error.message}, using fallback pattern`
            );
          }
        }

        // Query detections using ES|QL with aggregations
        // Use TO_DATETIME to convert ISO string to datetime for comparison
        // Result will be grouped by severity with counts
        let result: any = {
          columns: [
            { name: 'severity', type: 'keyword' },
            { name: 'count', type: 'long' },
          ],
          values: [],
        };

        // Build date range filter using normalized dates
        // "since" means inclusive, so use >= for start date
        let dateFilter: string;
        if (timeRange.endDate && timeRange.end) {
          dateFilter = `@timestamp >= TO_DATETIME("${timeRange.start}") AND @timestamp <= TO_DATETIME("${timeRange.end}")`;
        } else {
          dateFilter = `@timestamp >= TO_DATETIME("${timeRange.start}")`;
        }

        // Build query matching the DSL structure:
        // - Filter for open workflow_status
        // - Exclude building_block_type alerts
        // - Filter by date range
        // - Group by severity and count
        const query = `FROM ${indexPattern}
| WHERE ${dateFilter}
  AND kibana.alert.workflow_status == "open"
  AND kibana.alert.building_block_type IS NULL
| EVAL severity = COALESCE(kibana.alert.severity, "unknown")
| STATS count = COUNT(*) BY severity
| SORT severity DESC`;

        try {
          result = await executeEsql({
            query,
            esClient: esClient.asCurrentUser,
          });

          // Calculate totals from grouped results
          // ES|QL STATS BY returns: aggregated columns first, then grouping columns
          // Based on "STATS count = COUNT(*) BY severity", columns are: [count, severity]
          const countIndex = result.columns.findIndex((col: any) => col.name === 'count');
          const severityIndex = result.columns.findIndex((col: any) => col.name === 'severity');

          if (countIndex === -1 || severityIndex === -1) {
            logger.error(
              `[CatchUp Agent] Unexpected column structure: ${JSON.stringify(result.columns)}`
            );
            throw new Error('Unexpected query result structure');
          }

          // Calculate total and severity breakdown
          const severityCounts: Record<string, number> = {};
          let total = 0;

          result.values.forEach((row: any[]) => {
            const count = Number(row[countIndex]);
            const severity = String(row[severityIndex] || 'unknown');

            if (isNaN(count)) {
              logger.warn(
                `[CatchUp Agent] Invalid count value in row: ${JSON.stringify(
                  row
                )}, countIndex=${countIndex}`
              );
              return;
            }

            total += count;
            severityCounts[severity] = count;
          });

          // Fetch sample alerts with entity fields, prioritizing critical/high severity
          // Limit to top 20 alerts to avoid overwhelming the response
          // Note: ES|QL doesn't support _id directly, so we'll use metadata._id if available
          const alertsQuery = `FROM ${indexPattern}
| WHERE ${dateFilter}
  AND kibana.alert.workflow_status == "open"
  AND kibana.alert.building_block_type IS NULL
| EVAL severity = COALESCE(kibana.alert.severity, "unknown")
| SORT severity DESC, @timestamp DESC
| LIMIT 20
| KEEP
    @timestamp,
    severity,
    kibana.alert.rule.name,
    kibana.alert.rule.uuid,
    kibana.alert.rule.rule_id,
    kibana.alert.reason,
    kibana.alert.risk_score,
    host.name,
    host.ip,
    user.name,
    user.id,
    source.ip,
    source.port,
    destination.ip,
    destination.port,
    event.action,
    event.category,
    event.type,
    message`;

          let sampleAlerts: any[] = [];
          try {
            const alertsResult = await executeEsql({
              query: alertsQuery,
              esClient: esClient.asCurrentUser,
            });

            // Transform ES|QL result into array of alert objects
            if (alertsResult.columns && alertsResult.values) {
              const columnMap = new Map(
                alertsResult.columns.map((col: any, idx: number) => [col.name, idx])
              );

              sampleAlerts = alertsResult.values.map((row: any[]) => {
                const alert: any = {};
                columnMap.forEach((index, fieldName) => {
                  const value = row[index];
                  if (value !== null && value !== undefined) {
                    alert[fieldName] = value;
                  }
                });
                return alert;
              });
            }
          } catch (error: any) {
            // Continue without sample alerts - summary is still useful
          }

          // Generate URL to alerts page with time range
          const { core } = getPluginServices();
          const alertsPageUrl = getAlertsPageUrl(request, core, timeRange.start, timeRange.end);

          // Return both the grouped results and a summary with sample alerts
          return {
            results: [
              {
                type: ToolResultType.tabularData,
                data: {
                  source: 'esql',
                  columns: result.columns,
                  values: result.values,
                },
              },
              {
                type: ToolResultType.other,
                data: {
                  total,
                  by_severity: severityCounts,
                  start: timeRange.start,
                  end: timeRange.end,
                  alerts_page_url: alertsPageUrl,
                  sample_alerts: sampleAlerts,
                  // Extract entity information from sample alerts for easy access
                  entities: {
                    hosts: Array.from(
                      new Set(sampleAlerts.map((a: any) => a['host.name']).filter((h: any) => h))
                    ).slice(0, 10),
                    users: Array.from(
                      new Set(sampleAlerts.map((a: any) => a['user.name']).filter((u: any) => u))
                    ).slice(0, 10),
                    source_ips: Array.from(
                      new Set(sampleAlerts.map((a: any) => a['source.ip']).filter((ip: any) => ip))
                    ).slice(0, 10),
                    destination_ips: Array.from(
                      new Set(
                        sampleAlerts.map((a: any) => a['destination.ip']).filter((ip: any) => ip)
                      )
                    ).slice(0, 10),
                  },
                },
              },
            ],
          };
        } catch (error: any) {
          logger.error(
            `[CatchUp Agent] Error executing detections query: ${error.message}, query: ${query}`
          );
          throw error;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in detections summary tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error summarizing detections: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'detections'],
  };
};
