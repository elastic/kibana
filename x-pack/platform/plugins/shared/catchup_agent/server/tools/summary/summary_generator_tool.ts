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

        // Recursively search for a key in an object tree
        const findNestedKey = (
          obj: any,
          key: string,
          maxDepth: number = 5,
          currentDepth: number = 0
        ): any => {
          if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
            return null;
          }

          // Handle arrays by searching each element
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findNestedKey(item, key, maxDepth, currentDepth + 1);
              if (found !== null) return found;
            }
            return null;
          }

          // Direct key match
          if (key in obj) {
            return obj[key];
          }

          // Recursively search in object values
          for (const value of Object.values(obj)) {
            if (value && typeof value === 'object') {
              const found = findNestedKey(value, key, maxDepth, currentDepth + 1);
              if (found !== null) return found;
            }
          }

          return null;
        };

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
                const parsed = JSON.parse(data);
                // If the parsed result is still a string (double-stringified), parse again
                if (typeof parsed === 'string') {
                  try {
                    return JSON.parse(parsed);
                  } catch (e2) {
                    logger.warn(`Failed to parse double-stringified data: ${e2}`);
                    return {};
                  }
                }
                return parsed;
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
              const parsed = JSON.parse(value);
              // Check if parsed result is a workflow response structure
              if (
                parsed &&
                typeof parsed === 'object' &&
                parsed.results &&
                Array.isArray(parsed.results)
              ) {
                // Recursively extract from the workflow response structure
                return extractDataFromResponse(parsed);
              }
              // If the parsed result is still a string (double-stringified), parse again
              if (typeof parsed === 'string') {
                try {
                  return JSON.parse(parsed);
                } catch (e2) {
                  logger.warn(`Failed to parse double-stringified value: ${e2}`);
                  return {};
                }
              }
              return parsed;
            } catch (e) {
              logger.warn(
                `Failed to parse value as JSON: ${e}, value preview: ${value.substring(0, 200)}`
              );
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
        const entitiesRaw = correlatedData.entities || {};
        const relatedAlertsRaw = correlatedData.related_alerts || {};

        const security = extractDataFromResponse(securityRaw);
        const observability = extractDataFromResponse(observabilityRaw);
        const search = extractDataFromResponse(searchRaw);

        // Extract entities and related alerts
        const entitiesData = extractDataFromResponse(entitiesRaw);
        const relatedAlertsData = extractDataFromResponse(relatedAlertsRaw);

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
            // First try direct access to common locations
            if (extracted.correlations && Array.isArray(extracted.correlations)) {
              correlations = extracted.correlations;
            } else if (extracted.prioritized_items && Array.isArray(extracted.prioritized_items)) {
              correlations = extracted.prioritized_items;
            } else {
              // Recursively search for correlations array anywhere in the object tree
              const foundCorrelations = findNestedKey(extracted, 'correlations');
              if (foundCorrelations && Array.isArray(foundCorrelations)) {
                correlations = foundCorrelations;
              } else {
                // Try searching for prioritized_items as well
                const foundPrioritized = findNestedKey(extracted, 'prioritized_items');
                if (foundPrioritized && Array.isArray(foundPrioritized)) {
                  correlations = foundPrioritized;
                }
              }
            }
          }
        }

        // Fallback: if no correlations found, check if they're in reranker output
        if (correlations.length === 0) {
          const rerankerOutput =
            correlatedData.prioritize_with_reranker || correlatedData.reranker_output;
          if (rerankerOutput) {
            const rerankerExtracted = extractDataFromResponse(rerankerOutput);
            if (
              rerankerExtracted?.prioritized_items &&
              Array.isArray(rerankerExtracted.prioritized_items)
            ) {
              correlations = rerankerExtracted.prioritized_items;
            } else {
              // Try recursive search in reranker output
              const found =
                findNestedKey(rerankerExtracted, 'correlations') ||
                findNestedKey(rerankerExtracted, 'prioritized_items');
              if (found && Array.isArray(found)) {
                correlations = found;
              }
            }
          }
        }

        // Count Slack messages that are part of correlations (for External Context section)
        const correlatedSlackCount = correlations.reduce((count: number, corr: any) => {
          if (corr.slack && Array.isArray(corr.slack)) {
            return count + corr.slack.length;
          }
          return count;
        }, 0);

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

        // Build a more useful summary with actionable insights
        const hasHighSeverityDetections =
          (detections?.detections_by_severity?.high || detections?.by_severity?.high || 0) > 0;
        const hasCriticalSeverityDetections =
          (detections?.detections_by_severity?.critical || detections?.by_severity?.critical || 0) >
          0;
        const hasOpenCases =
          cases?.cases?.some((c: any) => c.status === 'open') ||
          cases?.values?.some((c: any) => c.status === 'open') ||
          false;
        const criticalCases = (cases?.cases || cases?.values || []).filter(
          (c: any) =>
            c.severity === 'critical' ||
            c.severity === 'high' ||
            (c.total_alerts && c.total_alerts > 10)
        );

        // Extract sample alerts and entities from detections
        const sampleAlerts = detections?.sample_alerts || [];
        const entities = detections?.entities || {};
        const criticalAlerts = sampleAlerts.filter(
          (a: any) => a.severity === 'critical' || a.severity === 'high'
        );

        // Build Security section with proper formatting
        const securityItems: string[] = [];
        if (attackDiscoveries) {
          securityItems.push(`- **${attackDiscoveries.total || 0} new attack discoveries**`);
        }
        if (detections) {
          const detectionsText = `- **${
            detections.total || detections.detections_total || 0
          } detections** (${
            detections.detections_by_severity?.high || detections.by_severity?.high || 0
          } high, ${
            detections.detections_by_severity?.low || detections.by_severity?.low || 0
          } low)${hasHighSeverityDetections ? ' ⚠️' : ''}${
            hasCriticalSeverityDetections ? ' 🚨' : ''
          }`;
          securityItems.push(detectionsText);
        }
        if (cases) {
          securityItems.push(
            `- **${cases.total || 0} updated cases**${hasOpenCases ? ' (some open)' : ''}`
          );
        }
        if (criticalCases.length > 0) {
          securityItems.push(
            `- **${criticalCases.length} critical/high severity case(s)** requiring attention`
          );
        }
        if (ruleChanges) {
          securityItems.push(`- ${ruleChanges.total || 0} rule changes`);
        }

        // Build critical alerts section
        let criticalAlertsSection = '';
        if (criticalAlerts.length > 0) {
          criticalAlertsSection = `\n### Critical/High Severity Alerts\n*Top ${criticalAlerts.length} critical/high severity alerts with entity information:*\n\n`;
          criticalAlertsSection += criticalAlerts
            .map((alert: any, idx: number) => {
              const ruleName = alert['kibana.alert.rule.name'] || 'Unknown Rule';
              const severity = alert.severity || 'unknown';
              const reason = alert['kibana.alert.reason'] || '';
              const timestamp = alert['@timestamp']
                ? new Date(alert['@timestamp']).toLocaleString()
                : '';
              const hostName = alert['host.name'] || '';
              const userName = alert['user.name'] || '';
              const sourceIp = alert['source.ip'] || '';
              const destIp = alert['destination.ip'] || '';
              const eventAction = alert['event.action'] || '';
              const eventCategory = alert['event.category'] || '';

              let alertText = `${idx + 1}. **${ruleName}** (${severity})\n`;
              if (reason) {
                alertText += `   - Reason: ${reason.substring(0, 200)}${
                  reason.length > 200 ? '...' : ''
                }\n`;
              }
              if (hostName) alertText += `   - Host: ${hostName}\n`;
              if (userName) alertText += `   - User: ${userName}\n`;
              if (sourceIp) alertText += `   - Source IP: ${sourceIp}\n`;
              if (destIp) alertText += `   - Destination IP: ${destIp}\n`;
              if (eventAction || eventCategory) {
                alertText += `   - Event: ${eventCategory ? `${eventCategory}` : ''}${
                  eventAction ? `/${eventAction}` : ''
                }\n`;
              }
              if (timestamp) alertText += `   - Time: ${timestamp}\n`;
              return alertText;
            })
            .join('\n');
        }

        // Build entities section from detections (legacy support)
        let entitiesSection = '';
        if (
          Object.keys(entities).length > 0 &&
          (entities.hosts?.length > 0 ||
            entities.users?.length > 0 ||
            entities.source_ips?.length > 0 ||
            entities.destination_ips?.length > 0)
        ) {
          entitiesSection = `\n### Entities Involved\n`;
          if (entities.hosts?.length > 0) {
            entitiesSection += `- **Hosts**: ${entities.hosts.join(', ')}${
              entities.hosts.length >= 10 ? ' (and more)' : ''
            }\n`;
          }
          if (entities.users?.length > 0) {
            entitiesSection += `- **Users**: ${entities.users.join(', ')}${
              entities.users.length >= 10 ? ' (and more)' : ''
            }\n`;
          }
          if (entities.source_ips?.length > 0) {
            entitiesSection += `- **Source IPs**: ${entities.source_ips.join(', ')}${
              entities.source_ips.length >= 10 ? ' (and more)' : ''
            }\n`;
          }
          if (entities.destination_ips?.length > 0) {
            entitiesSection += `- **Destination IPs**: ${entities.destination_ips.join(', ')}${
              entities.destination_ips.length >= 10 ? ' (and more)' : ''
            }\n`;
          }
        }

        // Build extracted entities section with relationships
        let extractedEntitiesSection = '';
        let entitySummarySection = '';
        const extractedEntities = entitiesData?.entities || entitiesData || {};
        const relatedAlerts = relatedAlertsData?.alerts || relatedAlertsData?.data?.alerts || [];

        if (
          extractedEntities &&
          (extractedEntities.host_names?.length > 0 ||
            extractedEntities.service_names?.length > 0 ||
            extractedEntities.user_names?.length > 0 ||
            extractedEntities.source_ips?.length > 0 ||
            extractedEntities.destination_ips?.length > 0)
        ) {
          // Build entity summary section
          const totalEntities =
            (extractedEntities.host_names?.length || 0) +
            (extractedEntities.service_names?.length || 0) +
            (extractedEntities.user_names?.length || 0) +
            (extractedEntities.source_ips?.length || 0) +
            (extractedEntities.destination_ips?.length || 0);

          if (totalEntities > 0) {
            entitySummarySection = `\n## Key Entities\n`;
            entitySummarySection += `*Most important entities extracted from the incident (prioritized by correlation frequency):*\n\n`;

            // Prioritize entities by counting how many times they appear in correlations and related alerts
            const entityScores: Map<string, number> = new Map();

            // Score entities based on correlations
            if (correlations && Array.isArray(correlations)) {
              for (const corr of correlations) {
                if (corr.service) {
                  entityScores.set(
                    `service:${corr.service}`,
                    (entityScores.get(`service:${corr.service}`) || 0) + 1
                  );
                }
                if (corr.observability && typeof corr.observability === 'object') {
                  const obsTitle = (corr.observability as any).title || '';
                  const obsDesc = (corr.observability as any).description || '';
                  const obsText = `${obsTitle} ${obsDesc}`.toLowerCase();
                  // Check if any host names appear in observability case
                  for (const hostName of extractedEntities.host_names || []) {
                    if (obsText.includes(hostName.toLowerCase())) {
                      entityScores.set(
                        `host:${hostName}`,
                        (entityScores.get(`host:${hostName}`) || 0) + 2
                      );
                    }
                  }
                }
              }
            }

            // Score entities based on related alerts
            if (relatedAlerts && Array.isArray(relatedAlerts)) {
              for (const alert of relatedAlerts) {
                const alertHost = alert.host?.name || alert.host_name || alert['host.name'];
                const alertService =
                  alert.service?.name || alert.service_name || alert['service.name'];
                const alertUser = alert.user?.name || alert.user_name || alert['user.name'];

                if (alertHost) {
                  entityScores.set(
                    `host:${alertHost}`,
                    (entityScores.get(`host:${alertHost}`) || 0) + 1
                  );
                }
                if (alertService) {
                  entityScores.set(
                    `service:${alertService}`,
                    (entityScores.get(`service:${alertService}`) || 0) + 1
                  );
                }
                if (alertUser) {
                  entityScores.set(
                    `user:${alertUser}`,
                    (entityScores.get(`user:${alertUser}`) || 0) + 1
                  );
                }
              }
            }

            // Sort entities by score and show top ones
            const sortedHosts = (extractedEntities.host_names || [])
              .map((host) => ({ name: host, score: entityScores.get(`host:${host}`) || 0 }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 5); // Top 5 hosts

            const sortedServices = (extractedEntities.service_names || [])
              .map((service) => ({
                name: service,
                score: entityScores.get(`service:${service}`) || 0,
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3); // Top 3 services

            const sortedUsers = (extractedEntities.user_names || [])
              .map((user) => ({ name: user, score: entityScores.get(`user:${user}`) || 0 }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3); // Top 3 users

            // Show prioritized entities
            if (sortedHosts.length > 0) {
              entitySummarySection += `### Hosts (${sortedHosts.length} most relevant)\n`;
              for (const { name } of sortedHosts) {
                entitySummarySection += `- \`host.name\`: "${name}"\n`;
              }
              entitySummarySection += '\n';
            }

            if (sortedServices.length > 0) {
              entitySummarySection += `### Services (${sortedServices.length} most relevant)\n`;
              for (const { name } of sortedServices) {
                entitySummarySection += `- \`service.name\`: "${name}"\n`;
              }
              entitySummarySection += '\n';
            }

            if (sortedUsers.length > 0) {
              entitySummarySection += `### Users (${sortedUsers.length} most relevant)\n`;
              for (const { name } of sortedUsers) {
                entitySummarySection += `- \`user.name\`: "${name}"\n`;
              }
              entitySummarySection += '\n';
            }

            // Show IPs if there are few, otherwise skip
            if (
              extractedEntities.source_ips?.length > 0 &&
              extractedEntities.source_ips.length <= 5
            ) {
              entitySummarySection += `### Source IPs\n`;
              for (const sourceIp of extractedEntities.source_ips.slice(0, 5)) {
                entitySummarySection += `- \`source.ip\`: "${sourceIp}"\n`;
              }
              entitySummarySection += '\n';
            }

            if (
              extractedEntities.destination_ips?.length > 0 &&
              extractedEntities.destination_ips.length <= 5
            ) {
              entitySummarySection += `### Destination Addresses\n`;
              for (const destIp of extractedEntities.destination_ips.slice(0, 5)) {
                entitySummarySection += `- \`destination.address\`: "${destIp}"\n`;
              }
              entitySummarySection += '\n';
            }

          }

          extractedEntitiesSection = `\n## Extracted Entities and Relationships\n`;
          extractedEntitiesSection += `*Entities extracted from the incident and their relationships to security/observability cases and alerts:*\n\n`;

          // Map entities to related cases and alerts
          const allCases = cases?.cases || cases?.values || [];

          // Extract observability cases - handle nested structure from observability_summary
          let observabilityCases: any[] = [];
          if (observability?.observability_summary?.cases) {
            const obsCasesData = observability.observability_summary.cases;
            if (Array.isArray(obsCasesData)) {
              observabilityCases = obsCasesData;
            } else if (obsCasesData?.cases && Array.isArray(obsCasesData.cases)) {
              observabilityCases = obsCasesData.cases;
            } else if (obsCasesData?.values && Array.isArray(obsCasesData.values)) {
              observabilityCases = obsCasesData.values;
            }
          } else if (observability?.cases) {
            // Fallback: check if cases is directly on observability
            if (Array.isArray(observability.cases)) {
              observabilityCases = observability.cases;
            } else if (observability.cases?.cases && Array.isArray(observability.cases.cases)) {
              observabilityCases = observability.cases.cases;
            } else if (observability.cases?.values && Array.isArray(observability.cases.values)) {
              observabilityCases = observability.cases.values;
            }
          }

          const allObservabilityCases = [...allCases, ...observabilityCases];

          // Host names (prioritize these as they're most meaningful)
          if (extractedEntities.host_names?.length > 0) {
            extractedEntitiesSection += `### Host Names\n`;
            for (const hostName of extractedEntities.host_names.slice(0, 10)) {
              // Find related alerts
              const hostAlerts = relatedAlerts.filter(
                (a: any) =>
                  a.host?.name === hostName ||
                  a.host_name === hostName ||
                  a['host.name'] === hostName
              );
              // Find related cases (check if case mentions this host)
              const hostCases = allObservabilityCases.filter(
                (c: any) =>
                  c.title?.toLowerCase().includes(hostName.toLowerCase()) ||
                  c.description?.toLowerCase().includes(hostName.toLowerCase())
              );

              extractedEntitiesSection += `- **${hostName}**\n`;
              if (hostAlerts.length > 0) {
                extractedEntitiesSection += `  - Related Alerts: ${hostAlerts.length} alert(s) found\n`;
                // Show top 3 alerts
                for (const alert of hostAlerts.slice(0, 3)) {
                  const severity = alert.severity || 'unknown';
                  const ruleName = alert.rule?.name || 'Unknown Rule';
                  extractedEntitiesSection += `    - Alert ID: ${
                    alert.id || 'unknown'
                  } (${severity}) - ${ruleName}\n`;
                }
              }
              if (hostCases.length > 0) {
                extractedEntitiesSection += `  - Related Cases: ${hostCases.length} case(s) found\n`;
                for (const caseItem of hostCases.slice(0, 3)) {
                  const caseTitle = caseItem.title || caseItem.id || 'Unknown Case';
                  const caseUrl = caseItem.url || '';
                  extractedEntitiesSection += `    - [${caseTitle}](${caseUrl})\n`;
                }
              }
              if (hostAlerts.length === 0 && hostCases.length === 0) {
                extractedEntitiesSection += `  - No related alerts or cases found\n`;
              }
            }
            if (extractedEntities.host_names.length > 10) {
              extractedEntitiesSection += `- ... and ${
                extractedEntities.host_names.length - 10
              } more host(s)\n`;
            }
            extractedEntitiesSection += '\n';
          }

          // Service names
          if (extractedEntities.service_names?.length > 0) {
            extractedEntitiesSection += `### Service Names\n`;
            for (const serviceName of extractedEntities.service_names.slice(0, 10)) {
              // Find related alerts
              const serviceAlerts = relatedAlerts.filter(
                (a: any) => a.service?.name === serviceName || a.service_name === serviceName
              );
              // Find related cases (check if case mentions this service)
              const serviceCases = allObservabilityCases.filter(
                (c: any) =>
                  c.title?.toLowerCase().includes(serviceName.toLowerCase()) ||
                  c.description?.toLowerCase().includes(serviceName.toLowerCase())
              );

              extractedEntitiesSection += `- **${serviceName}**\n`;
              if (serviceAlerts.length > 0) {
                extractedEntitiesSection += `  - Related Alerts: ${serviceAlerts.length} alert(s) found\n`;
                // Show top 3 alerts
                for (const alert of serviceAlerts.slice(0, 3)) {
                  const severity = alert.severity || 'unknown';
                  const ruleName = alert.rule?.name || 'Unknown Rule';
                  extractedEntitiesSection += `    - Alert ID: ${
                    alert.id || 'unknown'
                  } (${severity}) - ${ruleName}\n`;
                }
              }
              if (serviceCases.length > 0) {
                extractedEntitiesSection += `  - Related Cases: ${serviceCases.length} case(s) found\n`;
                for (const caseItem of serviceCases.slice(0, 3)) {
                  const caseTitle = caseItem.title || caseItem.id || 'Unknown Case';
                  const caseUrl = caseItem.url || '';
                  extractedEntitiesSection += `    - [${caseTitle}](${caseUrl})\n`;
                }
              }
              if (serviceAlerts.length === 0 && serviceCases.length === 0) {
                extractedEntitiesSection += `  - No related alerts or cases found\n`;
              }
            }
            if (extractedEntities.service_names.length > 10) {
              extractedEntitiesSection += `- ... and ${
                extractedEntities.service_names.length - 10
              } more service(s)\n`;
            }
            extractedEntitiesSection += '\n';
          }

          // User names
          if (extractedEntities.user_names?.length > 0) {
            extractedEntitiesSection += `### User Names\n`;
            for (const userName of extractedEntities.user_names.slice(0, 10)) {
              // Find related alerts
              const userAlerts = relatedAlerts.filter(
                (a: any) => a.user?.name === userName || a.user_name === userName
              );
              // Find related cases
              const userCases = allObservabilityCases.filter(
                (c: any) =>
                  c.title?.toLowerCase().includes(userName.toLowerCase()) ||
                  c.description?.toLowerCase().includes(userName.toLowerCase())
              );

              extractedEntitiesSection += `- **${userName}**\n`;
              if (userAlerts.length > 0) {
                extractedEntitiesSection += `  - Related Alerts: ${userAlerts.length} alert(s) found\n`;
                for (const alert of userAlerts.slice(0, 3)) {
                  const severity = alert.severity || 'unknown';
                  const ruleName = alert.rule?.name || 'Unknown Rule';
                  extractedEntitiesSection += `    - Alert ID: ${
                    alert.id || 'unknown'
                  } (${severity}) - ${ruleName}\n`;
                }
              }
              if (userCases.length > 0) {
                extractedEntitiesSection += `  - Related Cases: ${userCases.length} case(s) found\n`;
                for (const caseItem of userCases.slice(0, 3)) {
                  const caseTitle = caseItem.title || caseItem.id || 'Unknown Case';
                  const caseUrl = caseItem.url || '';
                  extractedEntitiesSection += `    - [${caseTitle}](${caseUrl})\n`;
                }
              }
              if (userAlerts.length === 0 && userCases.length === 0) {
                extractedEntitiesSection += `  - No related alerts or cases found\n`;
              }
            }
            if (extractedEntities.user_names.length > 10) {
              extractedEntitiesSection += `- ... and ${
                extractedEntities.user_names.length - 10
              } more user(s)\n`;
            }
            extractedEntitiesSection += '\n';
          }

          // NOTE: IDs are NOT entities - we don't show them in the entities section
        }

        const markdown = `# Elastic CatchUp Summary

## Security
${securityItems.join('\n')}${criticalAlertsSection}${entitiesSection}

${(() => {
  // Extract observability data - handle nested structure
  const obsSummary = observability?.observability_summary || observability || {};
  const obsAlerts = obsSummary.alerts || {};
  const obsCases = obsSummary.cases || {};
  const obsCasesList = Array.isArray(obsCases) ? obsCases : obsCases.cases || obsCases.values || [];

  // Check for alerts data - handle both tabular and other result formats
  const hasAlerts =
    obsAlerts.total_alerts ||
    obsAlerts.open_alerts ||
    obsAlerts.resolved_alerts ||
    obsAlerts.top_services;
  const hasCases = obsCasesList.length > 0;

  if (hasAlerts || hasCases) {
    let obsSection = `## Observability\n`;

    if (hasAlerts) {
      obsSection += `${obsAlerts.total_alerts ? `- ${obsAlerts.total_alerts} total alerts` : ''}\n`;
      obsSection += `${obsAlerts.open_alerts ? `- ${obsAlerts.open_alerts} open alerts` : ''}\n`;
      obsSection += `${
        obsAlerts.resolved_alerts ? `- ${obsAlerts.resolved_alerts} resolved alerts` : ''
      }\n`;
      obsSection += `${
        obsAlerts.top_services ? `- Top services: ${obsAlerts.top_services.join(', ')}` : ''
      }\n`;
    }

    if (hasCases) {
      obsSection += `- **${obsCasesList.length} observability case(s)**\n`;
      // Show top cases
      for (const caseItem of obsCasesList.slice(0, 5)) {
        const caseTitle = caseItem.title || caseItem.id || 'Unknown Case';
        const caseUrl = caseItem.url || '';
        const severity = caseItem.severity || 'unknown';
        const status = caseItem.status || 'unknown';
        obsSection += `  - [${caseTitle}](${caseUrl}) (${status}, ${severity})\n`;
      }
      if (obsCasesList.length > 5) {
        obsSection += `  - ... and ${obsCasesList.length - 5} more case(s)\n`;
      }
    }

    obsSection += '\n';
    return obsSection;
  }
  return '';
})()}${entitySummarySection}${extractedEntitiesSection}
${
  search.total_queries || search.avg_ctr
    ? `## Search
${search.total_queries ? `- ${search.total_queries} queries` : ''}
${search.avg_ctr ? `- Average CTR: ${search.avg_ctr.toFixed(2)}%` : ''}

`
    : ''
}

${
  external.github?.pull_requests?.length || external.slack || external.gmail?.emails?.length
    ? (() => {
        const userMentions = external.slack?.userMentionMessages?.length || 0;
        const channelMessages = external.slack?.channelMessages?.length || 0;
        const dmMessages = external.slack?.dmMessages?.length || 0;
        const total = userMentions + channelMessages + dmMessages;
        const hasSlack = total > 0;
        const hasGithub = external.github?.pull_requests?.length > 0;
        const hasGmail = external.gmail?.emails?.length > 0;

        // Collect all Slack messages that are part of correlations
        const correlatedSlackMessages: any[] = [];
        correlations.forEach((corr: any) => {
          if (corr.slack && Array.isArray(corr.slack)) {
            correlatedSlackMessages.push(...corr.slack);
          }
        });

        if (hasSlack || hasGithub || hasGmail) {
          let slackSection = '';

          if (hasSlack) {
            slackSection += `- **Slack**: ${total} messages (${userMentions} mentions, ${channelMessages} channel, ${dmMessages} DMs)`;
            if (correlatedSlackCount > 0) {
              slackSection += ` - **${correlatedSlackCount} message(s) linked to security cases/alerts**`;
            }
            slackSection += '\n';

            // Only show correlated Slack messages (not all messages)
            if (correlatedSlackMessages.length > 0) {
              slackSection += `  \n  **Messages discussing security cases/alerts:**\n`;
              // Deduplicate messages by permalink
              const uniqueMessages = new Map();
              correlatedSlackMessages.forEach((msg: any) => {
                const key = msg.permalink || msg.ts || msg.text;
                if (key && !uniqueMessages.has(key)) {
                  uniqueMessages.set(key, msg);
                }
              });

              const uniqueMessagesArray = Array.from(uniqueMessages.values());
              for (const msg of uniqueMessagesArray.slice(0, 5)) {
                const channel = msg.channel || 'unknown';
                const permalink = msg.permalink || '';
                const textPreview = (msg.text || msg.message || '')
                  .substring(0, 200)
                  .replace(/\n/g, ' ');
                const user = msg.user || msg.username || msg.user_name || '';
                const timestamp = msg.ts
                  ? new Date(parseFloat(msg.ts) * 1000).toLocaleString()
                  : '';
                slackSection += `  - [${channel}](${permalink})${user ? ` by @${user}` : ''}${
                  timestamp ? ` (${timestamp})` : ''
                }\n`;
                slackSection += `    "${textPreview}${textPreview.length >= 200 ? '...' : ''}"\n`;
              }
              if (uniqueMessagesArray.length > 5) {
                slackSection += `  - ... and ${uniqueMessagesArray.length - 5} more message(s)\n`;
              }
            } else {
              // If no correlated messages, just show the count
              slackSection += `  \n  *No Slack messages were found to be directly linked to security cases or alerts in this time period.*\n`;
            }
          }

          return `## External Context
${hasGithub ? `- **GitHub**: ${external.github.pull_requests.length} PRs` : ''}
${slackSection}
${hasGmail ? `- **Gmail**: ${external.gmail.emails.length} emails` : ''}

`;
        }
        return '';
      })()
    : ''
}

## Correlations
${
  correlations.length > 0
    ? (() => {
        let correlationText = `- **${correlations.length} correlated events found**\n\n`;

        // Group correlations by type first
        const obsCaseCorrelations = correlations.filter(
          (c: any) =>
            (c.match_type === 'entity_host_observability' ||
              c.match_type === 'entity_service_observability') &&
            c.observability
        );
        const attackDiscoveryCorrelations = correlations.filter(
          (c: any) =>
            (c.match_type === 'entity_host_attack_discovery' ||
              c.match_type === 'entity_service_attack_discovery') &&
            c.observability
        );

        // Show observability case correlations first (high priority)
        if (obsCaseCorrelations.length > 0) {
          correlationText += `### Linked Observability Cases\n`;
          correlationText += `*Observability cases linked to incident entities:*\n\n`;
          for (const corr of obsCaseCorrelations.slice(0, 10)) {
            const obsCase = corr.observability;
            if (obsCase) {
              const caseTitle = obsCase.title || corr.title || 'Unknown Case';
              const caseUrl = obsCase.url || '';
              const severity = obsCase.severity || corr.severity || 'unknown';
              const status = obsCase.status || corr.status || 'unknown';
              const confidence = corr.confidence
                ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
                : '';

              correlationText += `- **[${caseTitle}](${caseUrl})**${confidence}\n`;
              correlationText += `  - Status: ${status} | Severity: ${severity}\n`;
              if (corr.service) {
                correlationText += `  - Linked via: ${corr.service}\n`;
              }
              correlationText += '\n';
            }
          }
          if (obsCaseCorrelations.length > 10) {
            correlationText += `- ... and ${
              obsCaseCorrelations.length - 10
            } more observability case(s)\n\n`;
          }
        }

        // Show attack discovery correlations
        if (attackDiscoveryCorrelations.length > 0) {
          correlationText += `### Related Attack Discoveries\n`;
          correlationText += `*Attack discoveries linked to incident entities:*\n\n`;
          for (const corr of attackDiscoveryCorrelations.slice(0, 10)) {
            const attack = corr.observability;
            if (attack) {
              const attackTitle = attack.title || corr.title || 'Unknown Attack Discovery';
              const attackUrl = attack.url || '';
              const severity = attack.severity || corr.severity || 'unknown';
              const confidence = corr.confidence
                ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
                : '';

              correlationText += `- **[${attackTitle}](${attackUrl})**${confidence}\n`;
              correlationText += `  - Severity: ${severity}\n`;
              if (corr.service) {
                correlationText += `  - Linked via: ${corr.service}\n`;
              }
              correlationText += '\n';
            }
          }
          if (attackDiscoveryCorrelations.length > 10) {
            correlationText += `- ... and ${
              attackDiscoveryCorrelations.length - 10
            } more attack discovery/discoveries\n\n`;
          }
        }

        // Group correlations by type (already filtered above for obsCaseCorrelations and attackDiscoveryCorrelations)
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
        const serviceCorrelations = correlations.filter(
          (c: any) => c.match_type === 'entity_service' && c.service
        );
        const entityAlertCorrelations = correlations.filter(
          (c: any) => c.match_type === 'entity_alert_id' && c.alert
        );
        const alertServiceCorrelations = correlations.filter(
          (c: any) => c.alert && c.service && c.github
        );

        if (slackCaseCorrelations.length > 0) {
          correlationText += `### Slack Messages Linked to Cases\n`;
          for (const corr of slackCaseCorrelations) {
            const caseId = corr.case;
            const caseData =
              cases.cases?.find((c: any) => c.id === caseId) ||
              cases.values?.find((c: any) => c.id === caseId);
            const caseTitle = corr.title || caseData?.title || caseId;
            const caseDescription = corr.description || caseData?.description || '';
            const caseUrl = caseData?.url || '';
            const severity = corr.severity || caseData?.severity || '';
            const status = corr.status || caseData?.status || '';
            const confidence = corr.confidence
              ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
              : '';
            const slackMessages = corr.slack || [];

            correlationText += `- **Case**: [${caseTitle}](${caseUrl})${confidence}\n`;
            if (caseDescription) {
              correlationText += `  - Description: ${caseDescription.substring(0, 200)}${
                caseDescription.length > 200 ? '...' : ''
              }\n`;
            }
            if (severity || status) {
              correlationText += `  - Status: ${status || 'unknown'} | Severity: ${
                severity || 'unknown'
              }\n`;
            }
            correlationText += `  - **Slack Messages** (${slackMessages.length}):\n`;
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || msg.message || '')
                .substring(0, 150)
                .replace(/\n/g, ' ');
              correlationText += `    - [${channel}](${permalink}) - "${textPreview}${
                textPreview.length >= 150 ? '...' : ''
              }"\n`;
            }
            correlationText += '\n';
          }
        }

        if (slackAlertCorrelations.length > 0) {
          correlationText += `### Slack Messages Linked to Alerts\n`;
          for (const corr of slackAlertCorrelations) {
            const alertId = corr.alert;
            const caseId = corr.case;
            const caseData = caseId
              ? cases.cases?.find((c: any) => c.id === caseId) ||
                cases.values?.find((c: any) => c.id === caseId)
              : null;
            const caseTitle = corr.title || caseData?.title || caseId || 'Unknown Case';
            const caseUrl = caseData?.url || '';
            const confidence = corr.confidence
              ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
              : '';
            const slackMessages = corr.slack || [];

            correlationText += `- **Alert**: ${alertId}${confidence}\n`;
            if (caseId && caseData) {
              correlationText += `  - **Case**: [${caseTitle}](${caseUrl})\n`;
            }
            correlationText += `  - **Slack Messages** (${slackMessages.length}):\n`;
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || msg.message || '')
                .substring(0, 150)
                .replace(/\n/g, ' ');
              correlationText += `    - [${channel}](${permalink}) - "${textPreview}${
                textPreview.length >= 150 ? '...' : ''
              }"\n`;
            }
            correlationText += '\n';
          }
        }

        if (slackAttackCorrelations.length > 0) {
          correlationText += `### Slack Messages Linked to Attack Discoveries\n`;
          for (const corr of slackAttackCorrelations) {
            const attackTitle = corr.title || 'Unknown Attack Discovery';
            const caseId = corr.case;
            const caseData = caseId
              ? cases.cases?.find((c: any) => c.id === caseId) ||
                cases.values?.find((c: any) => c.id === caseId)
              : null;
            const confidence = corr.confidence
              ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
              : '';
            const slackMessages = corr.slack || [];

            correlationText += `- **Attack Discovery**: ${attackTitle}${confidence}\n`;
            if (caseId && caseData) {
              correlationText += `  - **Related Case**: [${caseData.title}](${
                caseData.url || ''
              })\n`;
            }
            correlationText += `  - **Slack Messages** (${slackMessages.length}):\n`;
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || msg.message || '')
                .substring(0, 150)
                .replace(/\n/g, ' ');
              correlationText += `    - [${channel}](${permalink}) - "${textPreview}${
                textPreview.length >= 150 ? '...' : ''
              }"\n`;
            }
            correlationText += '\n';
          }
        }

        if (caseAlertCorrelations.length > 0) {
          correlationText += `### Cases with Linked Alerts\n`;
          correlationText += `*These cases have alerts directly linked to them, indicating active security incidents.*\n\n`;

          // Check if any of these cases have Slack discussions
          const caseIdsWithSlack = new Set(
            [...slackCaseCorrelations, ...slackAlertCorrelations]
              .filter((c: any) => c.case)
              .map((c: any) => c.case)
          );

          for (const corr of caseAlertCorrelations) {
            const caseId = corr.case;
            const caseData =
              cases.cases?.find((c: any) => c.id === caseId) ||
              cases.values?.find((c: any) => c.id === caseId);
            const caseTitle = corr.title || caseData?.title || caseId;
            const caseDescription = corr.description || caseData?.description || '';
            const caseUrl = caseData?.url || '';
            const severity = corr.severity || caseData?.severity || '';
            const status = corr.status || caseData?.status || '';
            const alertCount = caseData?.total_alerts || 0;
            const confidence = corr.confidence
              ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
              : '';
            const createdAt = caseData?.created_at || '';
            const updatedAt = caseData?.updated_at || caseData?.updatedAt || '';

            // Find Slack messages discussing this case
            const relatedSlackMessages = [
              ...slackCaseCorrelations
                .filter((c: any) => c.case === caseId)
                .flatMap((c: any) => c.slack || []),
              ...slackAlertCorrelations
                .filter((c: any) => c.case === caseId)
                .flatMap((c: any) => c.slack || []),
            ];

            correlationText += `- **[${caseTitle}](${caseUrl})**${confidence}\n`;
            if (caseDescription) {
              correlationText += `  - Description: ${caseDescription.substring(0, 200)}${
                caseDescription.length > 200 ? '...' : ''
              }\n`;
            }
            if (severity || status) {
              correlationText += `  - Status: ${status || 'unknown'} | Severity: ${
                severity || 'unknown'
              }\n`;
            }
            correlationText += `  - Linked Alerts: ${alertCount} alert(s)\n`;
            if (corr.alert && corr.alert !== 'linked_alerts') {
              correlationText += `  - Alert ID: ${corr.alert}\n`;
            }

            // Show Slack discussions if any
            if (relatedSlackMessages.length > 0) {
              correlationText += `  - **Discussed in Slack** (${relatedSlackMessages.length} message(s)):\n`;
              for (const msg of relatedSlackMessages.slice(0, 3)) {
                const channel = msg.channel || 'unknown';
                const permalink = msg.permalink || '';
                const textPreview = (msg.text || msg.message || '')
                  .substring(0, 120)
                  .replace(/\n/g, ' ');
                const user = msg.user || msg.username || '';
                correlationText += `    - [${channel}](${permalink})${
                  user ? ` by @${user}` : ''
                } - "${textPreview}${textPreview.length >= 120 ? '...' : ''}"\n`;
              }
              if (relatedSlackMessages.length > 3) {
                correlationText += `    - ... and ${
                  relatedSlackMessages.length - 3
                } more message(s)\n`;
              }
            }

            if (createdAt || updatedAt) {
              const dateInfo = updatedAt
                ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
                : createdAt
                ? `Created: ${new Date(createdAt).toLocaleString()}`
                : '';
              if (dateInfo) {
                correlationText += `  - ${dateInfo}\n`;
              }
            }
            correlationText += '\n';
          }
        }

        if (serviceCorrelations.length > 0) {
          correlationText += `### Service-Related Correlations\n`;
          for (const corr of serviceCorrelations) {
            const serviceName = corr.service;
            const confidence = corr.confidence
              ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
              : '';
            correlationText += `- **Service: ${serviceName}**${confidence}\n`;

            if (corr.github && corr.github.length > 0) {
              correlationText += `  - **GitHub PRs** (${corr.github.length}):\n`;
              for (const pr of corr.github.slice(0, 3)) {
                const prTitle = pr.title || 'Untitled PR';
                const prUrl = pr.html_url || pr.url || '';
                const prBody = (pr.body || '').substring(0, 150);
                correlationText += `    - [${prTitle}](${prUrl})${
                  prBody ? ` - ${prBody}${prBody.length >= 150 ? '...' : ''}` : ''
                }\n`;
              }
            }

            if (corr.slack && corr.slack.length > 0) {
              correlationText += `  - **Slack Messages** (${corr.slack.length}):\n`;
              for (const msg of corr.slack.slice(0, 3)) {
                const channel = msg.channel || 'unknown';
                const permalink = msg.permalink || '';
                const textPreview = (msg.text || msg.message || '').substring(0, 100);
                correlationText += `    - [${channel}](${permalink}) - "${textPreview}${
                  textPreview.length >= 100 ? '...' : ''
                }"\n`;
              }
            }
            correlationText += '\n';
          }
        }

        if (alertServiceCorrelations.length > 0) {
          correlationText += `### Alerts Linked to Services and GitHub\n`;
          for (const corr of alertServiceCorrelations) {
            const alertId = corr.alert;
            const serviceName = corr.service;
            correlationText += `- **Alert**: ${alertId} | **Service**: ${serviceName}\n`;

            if (corr.github && corr.github.length > 0) {
              correlationText += `  - **Related PRs**:\n`;
              for (const pr of corr.github.slice(0, 2)) {
                const prTitle = pr.title || 'Untitled PR';
                const prUrl = pr.html_url || pr.url || '';
                correlationText += `    - [${prTitle}](${prUrl})\n`;
              }
            }
            correlationText += '\n';
          }
        }

        if (entityAlertCorrelations.length > 0) {
          correlationText += `### Alerts Mentioned in Slack\n`;
          for (const corr of entityAlertCorrelations) {
            const alertId = corr.alert;
            const confidence = corr.confidence
              ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)`
              : '';
            correlationText += `- **Alert**: ${alertId}${confidence}\n`;

            if (corr.slack && corr.slack.length > 0) {
              correlationText += `  - **Slack Messages** (${corr.slack.length}):\n`;
              for (const msg of corr.slack.slice(0, 3)) {
                const channel = msg.channel || 'unknown';
                const permalink = msg.permalink || '';
                const textPreview = (msg.text || msg.message || '').substring(0, 100);
                correlationText += `    - [${channel}](${permalink}) - "${textPreview}${
                  textPreview.length >= 100 ? '...' : ''
                }"\n`;
              }
            }
            correlationText += '\n';
          }
        }

        // Extract and show entity names mentioned in correlations
        const mentionedEntities = new Set<string>();
        const mentionedServices = new Set<string>();
        const mentionedCases = new Set<string>();
        const mentionedAlerts = new Set<string>();

        correlations.forEach((corr: any) => {
          if (corr.service) mentionedServices.add(corr.service);
          if (corr.case) mentionedCases.add(corr.case);
          if (corr.alert && corr.alert !== 'linked_alerts') mentionedAlerts.add(corr.alert);
        });

        // Always show correlation summary statistics when there are correlations
        if (correlations.length > 0) {
          const correlationTypes = new Set(correlations.map((c: any) => c.match_type || 'unknown'));

          correlationText += `\n### Correlation Summary\n`;
          correlationText += `- **Total correlations**: ${correlations.length}\n`;

          // Map correlation types to human-readable descriptions
          const typeDescriptions: Record<string, string> = {
            exact_case_alert: 'Cases with linked alerts',
            slack_case_url: 'Slack messages mentioning cases',
            slack_alert_url: 'Slack messages mentioning alerts',
            slack_attack_discovery_url: 'Slack messages mentioning attack discoveries',
            entity_service: 'Service-related correlations across sources',
            entity_alert_id: 'Alerts mentioned in external sources',
            entity_host_observability: 'Observability cases linked to hosts',
            entity_host_attack_discovery: 'Attack discoveries linked to hosts',
            entity_host_security_case: 'Security cases linked to hosts',
            entity_service_observability: 'Observability cases linked to services',
            entity_service_attack_discovery: 'Attack discoveries linked to services',
          };

          if (correlationTypes.size > 0) {
            const typeList = Array.from(correlationTypes)
              .map((type) => {
                const description = typeDescriptions[type] || type;
                return `${type} (${description})`;
              })
              .join(', ');
            correlationText += `- **Correlation types**: ${typeList}\n`;
          }

          // Show what was found
          if (mentionedCases.size > 0) {
            const caseTitles = Array.from(mentionedCases)
              .map((caseId) => {
                const caseData =
                  cases.cases?.find((c: any) => c.id === caseId) ||
                  cases.values?.find((c: any) => c.id === caseId);
                return caseData?.title || caseId;
              })
              .slice(0, 5);
            correlationText += `- **Cases found**: ${caseTitles.join(', ')}${
              mentionedCases.size > 5 ? ` (and ${mentionedCases.size - 5} more)` : ''
            }\n`;
          }

          if (mentionedAlerts.size > 0) {
            correlationText += `- **Alerts mentioned**: ${mentionedAlerts.size} alert(s)\n`;
          }

          if (mentionedServices.size > 0) {
            correlationText += `- **Services mentioned**: ${Array.from(mentionedServices).join(
              ', '
            )}\n`;
          }

          // Count Slack messages in correlations
          const slackMessageCount = correlations.reduce((count: number, corr: any) => {
            return count + (corr.slack?.length || 0);
          }, 0);
          if (slackMessageCount > 0) {
            correlationText += `- **Slack discussions**: ${slackMessageCount} message(s) linked to security events\n`;
          }

          const avgConfidence =
            correlations
              .filter((c: any) => c.confidence)
              .reduce((sum: number, c: any) => sum + (c.confidence || 0), 0) /
            correlations.filter((c: any) => c.confidence).length;
          if (avgConfidence > 0 && !isNaN(avgConfidence)) {
            correlationText += `- **Average confidence**: ${(avgConfidence * 100).toFixed(0)}%\n`;
          }
        }

        return correlationText;
      })()
    : (() => {
        logger.warn(
          `==> Summary Generator: WARNING - No correlations found (correlations.length = ${correlations.length}), showing "No correlations found" message`
        );
        return '- No correlations found';
      })()
}

## Recommendations

${
  correlations.length > 0
    ? (() => {
        // Generate actionable recommendations based on prioritized correlations
        const recommendations: string[] = [];

        // Find high-priority correlations (observability cases, attack discoveries)
        const obsCorrelations = correlations.filter(
          (c: any) =>
            c.match_type === 'entity_host_observability' ||
            c.match_type === 'entity_service_observability'
        );
        const attackCorrelations = correlations.filter(
          (c: any) =>
            c.match_type === 'entity_host_attack_discovery' ||
            c.match_type === 'entity_service_attack_discovery'
        );
        const criticalCases = correlations.filter(
          (c: any) => c.severity === 'critical' || c.severity === 'high'
        );

        // Prioritize correlations by confidence and severity
        const prioritizedCorrelations = [...correlations]
          .sort((a: any, b: any) => {
            const aScore =
              (a.confidence || 0) * 100 +
              (a.severity === 'critical' ? 50 : a.severity === 'high' ? 25 : 0);
            const bScore =
              (b.confidence || 0) * 100 +
              (b.severity === 'critical' ? 50 : b.severity === 'high' ? 25 : 0);
            return bScore - aScore;
          })
          .slice(0, 10);

        if (obsCorrelations.length > 0) {
          recommendations.push(
            `🔍 **Review ${obsCorrelations.length} linked observability case(s)**: These cases may provide additional context about infrastructure issues related to this incident.`
          );
        }

        if (attackCorrelations.length > 0) {
          recommendations.push(
            `⚠️ **Investigate ${attackCorrelations.length} related attack discovery/discoveries**: These may indicate broader security implications beyond the initial incident.`
          );
        }

        if (criticalCases.length > 0) {
          recommendations.push(
            `🚨 **Priority: ${criticalCases.length} critical/high severity case(s) require immediate attention**. Review these cases first.`
          );
        }

        // Check for multi-host incidents
        const uniqueHosts = new Set<string>();
        prioritizedCorrelations.forEach((c: any) => {
          if (c.service && (c.service.includes('payment') || c.service.includes('prod'))) {
            uniqueHosts.add(c.service);
          }
        });
        if (uniqueHosts.size > 1) {
          recommendations.push(
            `🌐 **Multi-host incident detected**: ${uniqueHosts.size} different hosts are involved. This may indicate a coordinated attack or widespread issue.`
          );
        }

        // Check for open cases
        const openCases = correlations.filter((c: any) => c.status === 'open');
        if (openCases.length > 0) {
          recommendations.push(
            `📋 **${openCases.length} open case(s) need resolution**: Review and update case status as investigation progresses.`
          );
        }

        // Check for related alerts
        if (relatedAlerts && Array.isArray(relatedAlerts) && relatedAlerts.length > 0) {
          const highSeverityAlerts = relatedAlerts.filter(
            (a: any) => a.severity === 'critical' || a.severity === 'high'
          );
          if (highSeverityAlerts.length > 0) {
            recommendations.push(
              `🚨 **${highSeverityAlerts.length} high/critical severity alert(s) found**: Review these alerts for immediate threats.`
            );
          }
        }

        // Default recommendation if no specific ones
        if (recommendations.length === 0 && correlations.length > 0) {
          recommendations.push(
            `📊 **Review ${prioritizedCorrelations.length} prioritized correlation(s)**: These correlations have been ranked by relevance and severity.`
          );
        }

        if (recommendations.length === 0) {
          return '*No specific recommendations at this time. Continue monitoring the incident.*\n';
        }

        return recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n\n') + '\n';
      })()
    : '*No correlations found. Continue standard investigation procedures.*\n'
}

`;

        // Verify Correlations section is included
        const hasCorrelationsSection = markdown.includes('## Correlations');

        if (!hasCorrelationsSection) {
          logger.error(
            `==> Summary Generator: ERROR - Correlations section NOT found in final markdown! Markdown length: ${markdown.length}`
          );
          logger.error(
            `==> Summary Generator: ERROR - Correlations array had ${correlations.length} items but section is missing!`
          );
          logger.error(
            `==> Summary Generator: ERROR - Markdown ends with: ${markdown.substring(
              Math.max(0, markdown.length - 200)
            )}`
          );
          // FORCE ADD the correlations section if it's missing but correlations exist
          if (correlations.length > 0) {
            logger.error(
              `==> Summary Generator: ERROR RECOVERY - Forcing correlations section into markdown!`
            );
            markdown += `\n\n## Correlations\n- **${
              correlations.length
            } correlated events found**\n- Correlation types: ${correlations
              .map((c: any) => c.match_type)
              .join(', ')}\n`;
          }
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
        logger.error(`Error in summary generator tool: ${error}`);
        return {
          results: [createErrorResult(`Error generating summary: ${error}`)],
        };
      }
    },
    tags: ['summary', 'generator'],
  };
};
