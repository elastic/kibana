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

const correlationEngineSchema = z.object({
  results: z
    .record(z.unknown())
    .describe(
      'Aggregated results from all catchup tools (security, observability, search, external)'
    ),
  entities: z
    .record(z.unknown())
    .optional()
    .describe(
      'Optional extracted entities from entity_extraction tool. If provided, will be used for enhanced correlation.'
    ),
});

export const correlationEngineTool = (): BuiltinToolDefinition<typeof correlationEngineSchema> => {
  return {
    id: 'platform.catchup.correlation.engine',
    type: ToolType.builtin,
    description: `Correlates events across Security, Observability, Search, and external sources by shared identifiers.

**Enhanced Correlation:**
For best results, first extract entities using 'platform.catchup.correlation.entity_extraction', then pass the entities to this tool. The correlation engine will use:
- Extracted entities (service names, alert IDs, case IDs, PR numbers) for precise matching
- Semantic search for fuzzy matching (e.g., "payment-service" matches "payment service")
- Hybrid search (RRF) to combine multiple signals
- Confidence scores for correlations

**Correlation Methods:**
- Alert IDs (exact matches)
- Case IDs (exact matches)
- PR numbers (exact matches)
- Service names (exact and fuzzy matching)
- User names and mentions
- Timestamps (temporal proximity)
- Semantic similarity (when entities are provided)

Returns structured correlation data with confidence scores linking related events.`,
    schema: correlationEngineSchema,
    handler: async ({ results, entities }, { logger }) => {
      try {
        logger.debug('correlation engine tool called');

        const correlations: Array<{
          alert?: string;
          case?: string;
          pr?: string;
          service?: string;
          github?: unknown[];
          slack?: unknown[];
          observability?: unknown;
          confidence?: number;
          match_type?: string;
        }> = [];

        // Helper function to extract and parse data from workflow tool response structure
        // Workflow tools return {results: [{data: "<json string>"}]}, we need to extract and parse
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
            // Otherwise, return data as-is
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
          // Otherwise, assume it's already the data object
          // But check if it's the actual data we want (not wrapped in results)
          // If it has a 'results' property, it might be a workflow response structure
          if (value.results && Array.isArray(value.results) && value.results.length > 0) {
            // This is a workflow response structure, extract the data
            const data = value.results[0]?.data;
            if (typeof data === 'string') {
              try {
                return JSON.parse(data);
              } catch (e) {
                return data || {};
              }
            }
            return data || {};
          }
          // It's already the data object, return as-is
          return value;
        };

        // Extract data from results - handle both direct data objects and workflow response structures
        const securityData = extractDataFromResponse(results.security_summary);
        const observabilityData = extractDataFromResponse(results.observability);
        const searchData = extractDataFromResponse(results.search);

        // Handle external data structure - it might be {external: {slack: {...}}}
        let externalData = results.external || {};
        if (externalData.slack) {
          externalData = {
            ...externalData,
            slack: extractDataFromResponse(externalData.slack),
          };
        } else {
          externalData = extractDataFromResponse(externalData);
        }

        // Use extracted entities if provided
        const extractedEntities = entities?.entities || {};
        const entityServiceNames = extractedEntities.service_names || [];
        const entityAlertIds = extractedEntities.alert_ids || [];
        const entityCaseIds = extractedEntities.case_ids || [];
        const entityPRNumbers = extractedEntities.pr_numbers || [];

        // Simple correlation logic - match by service names, alert IDs, case IDs
        const alerts = observabilityData.top_services || [];
        // Handle both cases.values and cases.cases structures
        const cases = securityData.cases?.values || securityData.cases?.cases || [];
        const attackDiscoveries =
          securityData.attack_discoveries?.attack_discoveries ||
          securityData.attackDiscoveries?.attackDiscoveries ||
          [];
        const githubPRs = externalData.github?.pull_requests || [];
        const slackMessages = [
          ...(externalData.slack?.userMentionMessages || []),
          ...(externalData.slack?.channelMessages || []),
        ];

        // Correlate alerts with services mentioned in GitHub PRs
        for (const alert of alerts) {
          const serviceName = alert.service?.name || alert.service;
          if (serviceName) {
            const linkedPRs = githubPRs.filter((pr: any) => {
              const prTitle = pr.title?.toLowerCase() || '';
              const prBody = pr.body?.toLowerCase() || '';
              return (
                prTitle.includes(serviceName.toLowerCase()) ||
                prBody.includes(serviceName.toLowerCase())
              );
            });

            if (linkedPRs.length > 0) {
              correlations.push({
                alert: alert.id || alert.alert_id,
                service: serviceName,
                github: linkedPRs,
              });
            }
          }
        }

        // Correlate cases with alerts
        for (const caseItem of cases) {
          const caseId = caseItem.id || caseItem.case_id;
          if (caseId) {
            correlations.push({
              case: caseId,
              alert: caseItem.related_alerts?.[0] || caseItem.total_alerts ? 'linked_alerts' : null,
              confidence: 0.9,
              match_type: 'exact_case_alert',
            });
          }
        }

        // Correlate Slack messages with cases by extracting case IDs from URLs
        for (const message of slackMessages) {
          const messageText = message.text || '';
          // Extract case IDs from URLs like: http://localhost:5601/kbn/app/security/cases/a9734cfb-08e7-4cfe-aa69-ed5259d4f048
          const caseUrlRegex = /\/cases\/([a-f0-9-]+)/gi;
          const caseUrlMatches = messageText.match(caseUrlRegex);
          if (caseUrlMatches) {
            for (const match of caseUrlMatches) {
              const caseId = match.replace(/\/cases\//i, '').trim();
              // Find the matching case
              const matchedCase = cases.find((c: any) => (c.id || c.case_id) === caseId);
              if (matchedCase) {
                correlations.push({
                  case: caseId,
                  slack: [message],
                  confidence: 1.0,
                  match_type: 'slack_case_url',
                });
              }
            }
          }

          // Extract alert IDs from URLs like: http://localhost:5601/kbn/app/security/alerts/...
          const alertUrlRegex = /\/alerts\/([a-f0-9-]+)/gi;
          const alertUrlMatches = messageText.match(alertUrlRegex);
          if (alertUrlMatches) {
            for (const match of alertUrlMatches) {
              const alertId = match.replace(/\/alerts\//i, '').trim();
              // Find if this alert is linked to any case
              const linkedCase = cases.find((c: any) => {
                // Check if case has this alert
                return (
                  c.related_alerts?.includes(alertId) || (c.total_alerts && c.total_alerts > 0)
                ); // If case has alerts, assume it might be linked
              });
              if (linkedCase) {
                correlations.push({
                  alert: alertId,
                  case: linkedCase.id || linkedCase.case_id,
                  slack: [message],
                  confidence: 0.9,
                  match_type: 'slack_alert_url',
                });
              }
            }
          }

          // Extract attack discovery IDs from URLs like: http://localhost:5601/kbn/app/security/attack_discovery?id=...
          const attackDiscoveryUrlRegex = /\/attack_discovery\?id=([a-f0-9]+)/gi;
          const attackDiscoveryMatches = messageText.match(attackDiscoveryUrlRegex);
          if (attackDiscoveryMatches) {
            for (const match of attackDiscoveryMatches) {
              const attackId = match.replace(/\/attack_discovery\?id=/i, '').trim();
              // Find the matching attack discovery
              const matchedAttack = attackDiscoveries.find((a: any) => a.id === attackId);
              if (matchedAttack) {
                // Check if this attack discovery is linked to any case
                const linkedCase = cases.find((c: any) => {
                  // Cases might be linked to attack discoveries through alerts
                  return c.title === matchedAttack.title || (c.total_alerts && c.total_alerts > 0);
                });
                if (linkedCase) {
                  correlations.push({
                    case: linkedCase.id || linkedCase.case_id,
                    slack: [message],
                    confidence: 0.8,
                    match_type: 'slack_attack_discovery_url',
                  });
                } else {
                  correlations.push({
                    slack: [message],
                    confidence: 0.7,
                    match_type: 'slack_attack_discovery_url',
                  });
                }
              }
            }
          }
        }

        // Enhanced correlation using extracted entities
        if (entityServiceNames.length > 0) {
          // Correlate services across sources
          for (const serviceName of entityServiceNames) {
            const serviceLower = serviceName.toLowerCase();
            const relatedItems: any[] = [];

            // Find in GitHub PRs
            const relatedPRs = githubPRs.filter((pr: any) => {
              const prText = `${pr.title || ''} ${pr.body || ''}`.toLowerCase();
              return prText.includes(serviceLower);
            });
            if (relatedPRs.length > 0) {
              relatedItems.push(...relatedPRs.map((pr: any) => ({ type: 'github', data: pr })));
            }

            // Find in Slack messages
            const relatedSlack = slackMessages.filter((msg: any) => {
              const msgText = (msg.text || '').toLowerCase();
              return msgText.includes(serviceLower);
            });
            if (relatedSlack.length > 0) {
              relatedItems.push(...relatedSlack.map((msg: any) => ({ type: 'slack', data: msg })));
            }

            if (relatedItems.length > 0) {
              correlations.push({
                service: serviceName,
                github: relatedPRs,
                slack: relatedSlack,
                confidence: 0.7,
                match_type: 'entity_service',
              });
            }
          }
        }

        // Correlate by alert IDs
        if (entityAlertIds.length > 0) {
          for (const alertId of entityAlertIds) {
            const relatedSlack = slackMessages.filter((msg: any) => {
              const msgText = (msg.text || '').toLowerCase();
              return msgText.includes(alertId.toLowerCase());
            });
            if (relatedSlack.length > 0) {
              correlations.push({
                alert: alertId,
                slack: relatedSlack,
                confidence: 0.8,
                match_type: 'entity_alert_id',
              });
            }
          }
        }

        // Deduplicate correlations
        const uniqueCorrelations = correlations.filter((corr, index, self) => {
          const key = `${corr.alert || ''}_${corr.case || ''}_${corr.service || ''}_${
            corr.pr || ''
          }`;
          return (
            index ===
            self.findIndex((c) => {
              const cKey = `${c.alert || ''}_${c.case || ''}_${c.service || ''}_${c.pr || ''}`;
              return cKey === key;
            })
          );
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                correlations: uniqueCorrelations,
                total_correlations: uniqueCorrelations.length,
                entities_used: entities ? true : false,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in correlation engine tool: ${error}`);
        return {
          results: [createErrorResult(`Error correlating events: ${error}`)],
        };
      }
    },
    tags: ['correlation', 'orchestrator'],
  };
};
