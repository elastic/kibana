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
import { normalizeDateToCurrentYear } from '../utils/date_normalization';
import { getSpaceId, getPluginServices } from '../../services/service_locator';

const alertsByEntitiesSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to search alerts (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to search alerts (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed.'
    ),
  host_name: z.string().optional().describe('Filter alerts by host.name entity value'),
  user_name: z.string().optional().describe('Filter alerts by user.name entity value'),
  service_name: z.string().optional().describe('Filter alerts by service.name entity value'),
  source_ip: z.string().optional().describe('Filter alerts by source.ip entity value'),
  destination_ip: z.string().optional().describe('Filter alerts by destination.ip entity value'),
  alert_types: z
    .array(z.enum(['security', 'observability', 'both']))
    .optional()
    .default(['both'])
    .describe('Which alert types to search: security, observability, or both (default)'),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of alerts to return (default: 50, max: 200)'),
});

export const alertsByEntitiesTool = (): BuiltinToolDefinition<typeof alertsByEntitiesSchema> => {
  return {
    id: 'hackathon.catchup.alerts.by_entities',
    type: ToolType.builtin,
    description: `Searches for alerts (security and/or observability) filtered by entity values such as host.name, user.name, service.name, source.ip, or destination.ip. Returns actual alert details with alert IDs, not just counts.

Use this tool when you need to find specific alerts related to entities extracted from an incident (e.g., all alerts for a specific host, user, or service).

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range.

Entity filters (host_name, user_name, service_name, source_ip, destination_ip) can be provided to narrow down the search. At least one entity filter should be provided.

Returns alert details including alert IDs, timestamps, severity, rule names, entity fields, and other relevant information.`,
    schema: alertsByEntitiesSchema,
    handler: async (
      {
        start,
        end,
        host_name,
        user_name,
        service_name,
        source_ip,
        destination_ip,
        alert_types,
        limit,
      },
      { request, esClient, logger }
    ) => {
      try {
        logger.info(
          `[CatchUp Agent] Alerts by entities tool called with filters: host_name=${host_name}, user_name=${user_name}, service_name=${service_name}, source_ip=${source_ip}, destination_ip=${destination_ip}`
        );

        // Validate that at least one entity filter is provided
        if (!host_name && !user_name && !service_name && !source_ip && !destination_ip) {
          return {
            results: [
              createErrorResult(
                'At least one entity filter must be provided (host_name, user_name, service_name, source_ip, or destination_ip)'
              ),
            ],
          };
        }

        // Normalize dates
        const normalizedStart = normalizeDateToCurrentYear(start);
        const startDate = new Date(normalizedStart);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
        }

        let endDate: Date | null = null;
        let normalizedEnd: string | null = null;
        if (end) {
          normalizedEnd = normalizeDateToCurrentYear(end);
          endDate = new Date(normalizedEnd);
          if (isNaN(endDate.getTime())) {
            throw new Error(`Invalid datetime format: ${end}. Expected ISO 8601 format.`);
          }
        }

        // Build date range filter
        let dateFilter: string;
        if (endDate && normalizedEnd) {
          dateFilter = `@timestamp >= TO_DATETIME("${normalizedStart}") AND @timestamp < TO_DATETIME("${normalizedEnd}")`;
        } else {
          dateFilter = `@timestamp >= TO_DATETIME("${normalizedStart}")`;
        }

        // Build entity filters
        const entityFilters: string[] = [];
        if (host_name) {
          entityFilters.push(`host.name == "${host_name}"`);
        }
        if (user_name) {
          entityFilters.push(`user.name == "${user_name}"`);
        }
        if (service_name) {
          entityFilters.push(`service.name == "${service_name}"`);
        }
        if (source_ip) {
          entityFilters.push(`source.ip == "${source_ip}"`);
        }
        if (destination_ip) {
          entityFilters.push(`destination.ip == "${destination_ip}"`);
        }

        const entityFilterStr = entityFilters.join(' OR ');

        // Determine which alert types to search
        const searchSecurity = alert_types?.includes('security') || alert_types?.includes('both');
        const searchObservability =
          alert_types?.includes('observability') || alert_types?.includes('both');

        const allAlerts: any[] = [];

        // Search security alerts
        if (searchSecurity) {
          try {
            const spaceId = getSpaceId(request);
            let indexPattern: string = `.alerts-security.alerts-${spaceId}*`;

            // Get authorized alerts indices from Rule Registry
            const { plugin } = getPluginServices();
            if (plugin.ruleRegistry) {
              try {
                const racClient = await plugin.ruleRegistry.getRacClientWithRequest(request);
                const authorizedIndices = await racClient.getAuthorizedAlertsIndices(
                  SECURITY_SOLUTION_RULE_TYPE_IDS
                );

                if (authorizedIndices && authorizedIndices.length > 0) {
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

            const securityQuery = `FROM ${indexPattern} METADATA _id
| WHERE ${dateFilter}
  AND (${entityFilterStr})
  AND kibana.alert.workflow_status == "open"
  AND kibana.alert.building_block_type IS NULL
| EVAL severity = COALESCE(kibana.alert.severity, "unknown")
| SORT severity DESC, @timestamp DESC
| LIMIT ${Math.min(limit || 50, 200)}
| KEEP
    _id,
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
    service.name,
    source.ip,
    source.port,
    destination.ip,
    destination.port,
    event.action,
    event.category,
    event.type,
    message`;

            const securityResult = await executeEsql({
              query: securityQuery,
              esClient: esClient.asCurrentUser,
            });

            // Transform ES|QL result to alert objects
            if (securityResult.values && securityResult.values.length > 0) {
              const idIndex = securityResult.columns.findIndex((col: any) => col.name === '_id');
              const timestampIndex = securityResult.columns.findIndex(
                (col: any) => col.name === '@timestamp'
              );
              const severityIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'severity'
              );
              const ruleNameIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.rule.name'
              );
              const ruleUuidIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.rule.uuid'
              );
              const ruleIdIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.rule.rule_id'
              );
              const reasonIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.reason'
              );
              const riskScoreIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.risk_score'
              );
              const hostNameIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'host.name'
              );
              const hostIpIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'host.ip'
              );
              const userNameIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'user.name'
              );
              const userIdIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'user.id'
              );
              const serviceNameIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'service.name'
              );
              const sourceIpIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'source.ip'
              );
              const sourcePortIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'source.port'
              );
              const destIpIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'destination.ip'
              );
              const destPortIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'destination.port'
              );
              const eventActionIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'event.action'
              );
              const eventCategoryIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'event.category'
              );
              const eventTypeIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'event.type'
              );
              const messageIndex = securityResult.columns.findIndex(
                (col: any) => col.name === 'message'
              );

              for (const row of securityResult.values) {
                const alert: any = {
                  id: idIndex >= 0 ? row[idIndex] : null,
                  type: 'security',
                  timestamp: timestampIndex >= 0 ? row[timestampIndex] : null,
                  severity: severityIndex >= 0 ? row[severityIndex] : null,
                  rule: {
                    name: ruleNameIndex >= 0 ? row[ruleNameIndex] : null,
                    uuid: ruleUuidIndex >= 0 ? row[ruleUuidIndex] : null,
                    rule_id: ruleIdIndex >= 0 ? row[ruleIdIndex] : null,
                  },
                  reason: reasonIndex >= 0 ? row[reasonIndex] : null,
                  risk_score: riskScoreIndex >= 0 ? row[riskScoreIndex] : null,
                  host: {
                    name: hostNameIndex >= 0 ? row[hostNameIndex] : null,
                    ip: hostIpIndex >= 0 ? row[hostIpIndex] : null,
                  },
                  user: {
                    name: userNameIndex >= 0 ? row[userNameIndex] : null,
                    id: userIdIndex >= 0 ? row[userIdIndex] : null,
                  },
                  service: {
                    name: serviceNameIndex >= 0 ? row[serviceNameIndex] : null,
                  },
                  source: {
                    ip: sourceIpIndex >= 0 ? row[sourceIpIndex] : null,
                    port: sourcePortIndex >= 0 ? row[sourcePortIndex] : null,
                  },
                  destination: {
                    ip: destIpIndex >= 0 ? row[destIpIndex] : null,
                    port: destPortIndex >= 0 ? row[destPortIndex] : null,
                  },
                  event: {
                    action: eventActionIndex >= 0 ? row[eventActionIndex] : null,
                    category: eventCategoryIndex >= 0 ? row[eventCategoryIndex] : null,
                    type: eventTypeIndex >= 0 ? row[eventTypeIndex] : null,
                  },
                  message: messageIndex >= 0 ? row[messageIndex] : null,
                };
                allAlerts.push(alert);
              }
            }
          } catch (error: any) {
            logger.warn(
              `[CatchUp Agent] Error searching security alerts: ${error.message}. Continuing with observability alerts.`
            );
          }
        }

        // Search observability alerts
        if (searchObservability) {
          try {
            const observabilityQuery = `FROM .alerts-observability.*,.alerts-default.*,.alerts-stack.*,.alerts-ml.*,.alerts-dataset.* METADATA _id
| WHERE ${dateFilter}
  AND (${entityFilterStr})
  AND TO_STRING(kibana.alert.workflow_status) == "open"
| EVAL severity = COALESCE(kibana.alert.severity, "unknown")
| SORT severity DESC, @timestamp DESC
| LIMIT ${Math.min(limit || 50, 200)}
| KEEP
    _id,
    @timestamp,
    severity,
    kibana.alert.rule.name,
    kibana.alert.rule.uuid,
    kibana.alert.reason,
    host.name,
    host.ip,
    user.name,
    user.id,
    service.name,
    source.ip,
    destination.ip,
    event.action,
    event.category,
    event.type,
    message`;

            logger.debug(`[CatchUp Agent] Observability alerts query: ${observabilityQuery}`);
            const observabilityResult = await executeEsql({
              query: observabilityQuery,
              esClient: esClient.asCurrentUser,
            });

            // Transform ES|QL result to alert objects
            if (observabilityResult.values && observabilityResult.values.length > 0) {
              const idIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === '_id'
              );
              const timestampIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === '@timestamp'
              );
              const severityIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'severity'
              );
              const ruleNameIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.rule.name'
              );
              const ruleUuidIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.rule.uuid'
              );
              const reasonIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'kibana.alert.reason'
              );
              const hostNameIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'host.name'
              );
              const hostIpIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'host.ip'
              );
              const userNameIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'user.name'
              );
              const userIdIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'user.id'
              );
              const serviceNameIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'service.name'
              );
              const sourceIpIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'source.ip'
              );
              const destIpIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'destination.ip'
              );
              const eventActionIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'event.action'
              );
              const eventCategoryIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'event.category'
              );
              const eventTypeIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'event.type'
              );
              const messageIndex = observabilityResult.columns.findIndex(
                (col: any) => col.name === 'message'
              );

              for (const row of observabilityResult.values) {
                const alert: any = {
                  id: idIndex >= 0 ? row[idIndex] : null,
                  type: 'observability',
                  timestamp: timestampIndex >= 0 ? row[timestampIndex] : null,
                  severity: severityIndex >= 0 ? row[severityIndex] : null,
                  rule: {
                    name: ruleNameIndex >= 0 ? row[ruleNameIndex] : null,
                    uuid: ruleUuidIndex >= 0 ? row[ruleUuidIndex] : null,
                  },
                  reason: reasonIndex >= 0 ? row[reasonIndex] : null,
                  host: {
                    name: hostNameIndex >= 0 ? row[hostNameIndex] : null,
                    ip: hostIpIndex >= 0 ? row[hostIpIndex] : null,
                  },
                  user: {
                    name: userNameIndex >= 0 ? row[userNameIndex] : null,
                    id: userIdIndex >= 0 ? row[userIdIndex] : null,
                  },
                  service: {
                    name: serviceNameIndex >= 0 ? row[serviceNameIndex] : null,
                  },
                  source: {
                    ip: sourceIpIndex >= 0 ? row[sourceIpIndex] : null,
                  },
                  destination: {
                    ip: destIpIndex >= 0 ? row[destIpIndex] : null,
                  },
                  event: {
                    action: eventActionIndex >= 0 ? row[eventActionIndex] : null,
                    category: eventCategoryIndex >= 0 ? row[eventCategoryIndex] : null,
                    type: eventTypeIndex >= 0 ? row[eventTypeIndex] : null,
                  },
                  message: messageIndex >= 0 ? row[messageIndex] : null,
                };
                allAlerts.push(alert);
              }
            }
          } catch (error: any) {
            logger.warn(
              `[CatchUp Agent] Error searching observability alerts: ${error.message}. Continuing.`
            );
          }
        }

        // Sort all alerts by severity and timestamp
        allAlerts.sort((a, b) => {
          const severityOrder: Record<string, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
            unknown: 4,
          };
          const aSeverity = severityOrder[a.severity?.toLowerCase()] ?? 5;
          const bSeverity = severityOrder[b.severity?.toLowerCase()] ?? 5;
          if (aSeverity !== bSeverity) {
            return aSeverity - bSeverity;
          }
          // If same severity, sort by timestamp descending
          const aTime = new Date(a.timestamp || 0).getTime();
          const bTime = new Date(b.timestamp || 0).getTime();
          return bTime - aTime;
        });

        // Limit total results
        const limitedAlerts = allAlerts.slice(0, Math.min(limit || 50, 200));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                alerts: limitedAlerts,
                total: limitedAlerts.length,
                filters: {
                  host_name,
                  user_name,
                  service_name,
                  source_ip,
                  destination_ip,
                },
                start: normalizedStart,
                end: normalizedEnd || null,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`Error in alerts by entities tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`Alerts by entities tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error searching alerts by entities: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'observability', 'alerts', 'entities'],
  };
};
