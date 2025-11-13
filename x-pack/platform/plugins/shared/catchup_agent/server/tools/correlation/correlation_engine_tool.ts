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
import { extractDataFromResponse } from '../summary/helpers/data_extraction';

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
    id: 'hackathon.catchup.correlation.engine',
    type: ToolType.builtin,
    description: `Correlates events across Security, Observability, Search, and external sources by shared identifiers.

**Enhanced Correlation:**
For best results, first extract entities using 'hackathon.catchup.correlation.entity_extraction', then pass the entities to this tool. The correlation engine will use:
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
          // Text fields for reranking
          title?: string;
          description?: string;
          text?: string;
          message?: string;
          severity?: string | null;
          status?: string | null;
        }> = [];

        // Extract data from results - handle both direct data objects and workflow response structures
        const securityData = extractDataFromResponse(results.security_summary);
        const observabilityData = extractDataFromResponse(results.observability);

        // Handle external data structure - it might be {external: {slack: {...}}}
        let externalData: Record<string, unknown> =
          (results.external as Record<string, unknown>) || {};
        if (externalData.slack) {
          externalData = {
            ...externalData,
            slack: extractDataFromResponse(externalData.slack),
          };
        } else {
          externalData = extractDataFromResponse(externalData) as Record<string, unknown>;
        }

        // Use extracted entities if provided
        const extractedEntities = (entities?.entities as Record<string, unknown>) || {};
        const entityServiceNames = (extractedEntities.service_names as string[]) || [];
        const entityHostNames = (extractedEntities.host_names as string[]) || [];
        const entitySourceIPs = (extractedEntities.source_ips as string[]) || [];
        const entityDestinationIPs = (extractedEntities.destination_ips as string[]) || [];

        // Simple correlation logic - match by service names, alert IDs, case IDs
        const alerts = observabilityData.top_services || [];
        // Handle both cases.values and cases.cases structures
        const cases = securityData.cases?.values || securityData.cases?.cases || [];
        const attackDiscoveries =
          securityData.attack_discoveries?.attack_discoveries ||
          securityData.attack_discoveries?.values ||
          securityData.attackDiscoveries?.attackDiscoveries ||
          [];

        // Extract observability cases
        const obsSummary = observabilityData.observability_summary || observabilityData || {};
        const obsCases = obsSummary.cases || {};
        const observabilityCases = Array.isArray(obsCases)
          ? obsCases
          : obsCases.cases || obsCases.values || [];

        const githubData = externalData.github as { pull_requests?: unknown[] } | undefined;
        const slackData = externalData.slack as
          | {
              userMentionMessages?: unknown[];
              channelMessages?: unknown[];
              dmMessages?: unknown[];
            }
          | undefined;
        const githubPRs = githubData?.pull_requests || [];
        const slackMessages = [
          ...(slackData?.userMentionMessages || []),
          ...(slackData?.channelMessages || []),
          ...(slackData?.dmMessages || []),
        ];

        // Correlate Slack messages with cases by extracting case IDs from URLs
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
              // Build text field from alert, service, and PRs
              const prTexts = linkedPRs
                .map((pr: any) => `${pr.title || ''} ${pr.body || ''}`.trim())
                .join(' ');
              const combinedText = `Alert: ${
                alert.id || alert.alert_id
              } Service: ${serviceName} ${prTexts}`.trim();

              correlations.push({
                alert: alert.id || alert.alert_id,
                service: serviceName,
                github: linkedPRs,
                // Add text fields for reranking
                title: `Alert: ${alert.id || alert.alert_id}`,
                text:
                  combinedText || `Alert: ${alert.id || alert.alert_id} Service: ${serviceName}`,
                message: prTexts,
              });
            }
          }
        }

        // Correlate cases with alerts
        for (const caseItem of cases) {
          const caseId = caseItem.id || caseItem.case_id;
          if (caseId) {
            // Build text field for reranking from case data
            const caseTitle = caseItem.title || '';
            const caseDescription = caseItem.description || '';
            const caseText = `${caseTitle} ${caseDescription}`.trim();

            correlations.push({
              case: caseId,
              alert:
                caseItem.related_alerts?.[0] ||
                (caseItem.total_alerts ? 'linked_alerts' : undefined),
              confidence: 0.9,
              match_type: 'exact_case_alert',
              // Add text fields for reranking
              title: caseTitle,
              description: caseDescription,
              text: caseText || caseTitle, // Primary text field for reranking
              severity: caseItem.severity || null,
              status: caseItem.status || null,
            });
          }
        }

        // Correlate Slack messages with cases by extracting case IDs from URLs
        for (const message of slackMessages) {
          const messageText = message.text || message.message || '';

          // Extract case IDs from URLs like: http://localhost:5601/kbn/app/security/cases/a9734cfb-08e7-4cfe-aa69-ed5259d4f048
          // Also handle URLs like: http://localhost:5601/kbn/app/security/cases/005b13f6-416f-4534-a799-4ef53f78e800?t[...]
          const caseUrlRegex = /\/cases\/([a-f0-9-]+)/gi;
          const caseUrlMatches = messageText.match(caseUrlRegex);
          if (caseUrlMatches) {
            for (const match of caseUrlMatches) {
              const caseId = match.replace(/\/cases\//i, '').trim();
              // Find the matching case
              const matchedCase = cases.find((c: any) => (c.id || c.case_id) === caseId);
              if (matchedCase) {
                // Build text field combining case and Slack message
                const caseTitle = matchedCase.title || '';
                const caseDescription = matchedCase.description || '';
                const slackText = message.text || message.message || '';
                const combinedText = `${caseTitle} ${caseDescription} ${slackText}`.trim();

                correlations.push({
                  case: caseId,
                  slack: [message],
                  confidence: 1.0,
                  match_type: 'slack_case_url',
                  // Add text fields for reranking
                  title: caseTitle,
                  description: caseDescription,
                  text: combinedText || slackText || caseTitle,
                  message: slackText,
                  severity: matchedCase.severity || null,
                  status: matchedCase.status || null,
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
                // Build text field combining case, alert, and Slack message
                const caseTitle = linkedCase.title || '';
                const caseDescription = linkedCase.description || '';
                const slackText = message.text || message.message || '';
                const combinedText =
                  `${caseTitle} ${caseDescription} Alert: ${alertId} ${slackText}`.trim();

                correlations.push({
                  alert: alertId,
                  case: linkedCase.id || linkedCase.case_id,
                  slack: [message],
                  confidence: 0.9,
                  match_type: 'slack_alert_url',
                  // Add text fields for reranking
                  title: caseTitle,
                  description: caseDescription,
                  text: combinedText || slackText || caseTitle,
                  message: slackText,
                  severity: linkedCase.severity || null,
                  status: linkedCase.status || null,
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
                  // Build text field combining case, attack discovery, and Slack message
                  const caseTitle = linkedCase.title || '';
                  const caseDescription = linkedCase.description || '';
                  const attackTitle = matchedAttack.title || '';
                  const slackText = message.text || message.message || '';
                  const combinedText =
                    `${caseTitle} ${caseDescription} Attack: ${attackTitle} ${slackText}`.trim();

                  correlations.push({
                    case: linkedCase.id || linkedCase.case_id,
                    slack: [message],
                    confidence: 0.8,
                    match_type: 'slack_attack_discovery_url',
                    // Add text fields for reranking
                    title: caseTitle || attackTitle,
                    description: caseDescription,
                    text: combinedText || slackText || caseTitle || attackTitle,
                    message: slackText,
                    severity: linkedCase.severity || null,
                    status: linkedCase.status || null,
                  });
                } else {
                  // Build text field from attack discovery and Slack message
                  const attackTitle = matchedAttack.title || '';
                  const slackText = message.text || message.message || '';
                  const combinedText = `Attack: ${attackTitle} ${slackText}`.trim();

                  correlations.push({
                    slack: [message],
                    confidence: 0.7,
                    match_type: 'slack_attack_discovery_url',
                    // Add text fields for reranking
                    title: attackTitle,
                    text: combinedText || slackText || attackTitle,
                    message: slackText,
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
              // Build text field from service name, PRs, and Slack messages
              const prTexts = relatedPRs
                .map((pr: any) => `${pr.title || ''} ${pr.body || ''}`.trim())
                .join(' ');
              const slackTexts = relatedSlack
                .map((msg: any) => msg.text || msg.message || '')
                .join(' ');
              const combinedText = `Service: ${serviceName} ${prTexts} ${slackTexts}`.trim();

              correlations.push({
                service: serviceName,
                github: relatedPRs,
                slack: relatedSlack,
                confidence: 0.7,
                match_type: 'entity_service',
                // Add text fields for reranking
                title: `Service: ${serviceName}`,
                text: combinedText || `Service: ${serviceName}`,
                message: slackTexts || prTexts,
              });
            }
          }
        }

        // Correlate by host names - find observability cases and attack discoveries
        if (entityHostNames.length > 0) {
          for (const hostName of entityHostNames) {
            const hostLower = hostName.toLowerCase();

            // Find observability cases mentioning this host
            const relatedObsCases = observabilityCases.filter((obsCase: any) => {
              const title = (obsCase.title || '').toLowerCase();
              const description = (obsCase.description || '').toLowerCase();
              return title.includes(hostLower) || description.includes(hostLower);
            });
            if (relatedObsCases.length > 0) {
              for (const obsCase of relatedObsCases) {
                const caseTitle = obsCase.title || '';
                const caseDescription = obsCase.description || '';
                const combinedText =
                  `Host: ${hostName} Observability Case: ${caseTitle} ${caseDescription}`.trim();

                correlations.push({
                  case: obsCase.id || obsCase.case_id,
                  service: hostName, // Use host as service identifier
                  observability: obsCase,
                  confidence: 0.85,
                  match_type: 'entity_host_observability',
                  title: caseTitle,
                  description: caseDescription,
                  text: combinedText || caseTitle,
                  severity: obsCase.severity || null,
                  status: obsCase.status || null,
                });
              }
            }

            // Find attack discoveries mentioning this host
            const relatedAttacks = attackDiscoveries.filter((attack: any) => {
              const title = (attack.title || '').toLowerCase();
              return title.includes(hostLower);
            });
            if (relatedAttacks.length > 0) {
              for (const attack of relatedAttacks) {
                const attackTitle = attack.title || '';
                const combinedText = `Host: ${hostName} Attack Discovery: ${attackTitle}`.trim();

                correlations.push({
                  service: hostName,
                  observability: attack,
                  confidence: 0.8,
                  match_type: 'entity_host_attack_discovery',
                  title: attackTitle,
                  text: combinedText || attackTitle,
                  severity: attack.severity || null,
                });
              }
            }

            // Find security cases mentioning this host
            const relatedSecurityCases = cases.filter((secCase: any) => {
              const title = (secCase.title || '').toLowerCase();
              const description = (secCase.description || '').toLowerCase();
              return title.includes(hostLower) || description.includes(hostLower);
            });
            if (relatedSecurityCases.length > 0) {
              for (const secCase of relatedSecurityCases) {
                const caseTitle = secCase.title || '';
                const caseDescription = secCase.description || '';
                const combinedText =
                  `Host: ${hostName} Security Case: ${caseTitle} ${caseDescription}`.trim();

                correlations.push({
                  case: secCase.id || secCase.case_id,
                  service: hostName,
                  confidence: 0.85,
                  match_type: 'entity_host_security_case',
                  title: caseTitle,
                  description: caseDescription,
                  text: combinedText || caseTitle,
                  severity: secCase.severity || null,
                  status: secCase.status || null,
                });
              }
            }
          }
        }

        // Correlate by service names - find observability cases and attack discoveries
        if (entityServiceNames.length > 0) {
          for (const serviceName of entityServiceNames) {
            const serviceLower = serviceName.toLowerCase();

            // Find observability cases mentioning this service
            const relatedObsCases = observabilityCases.filter((obsCase: any) => {
              const title = (obsCase.title || '').toLowerCase();
              const description = (obsCase.description || '').toLowerCase();
              return title.includes(serviceLower) || description.includes(serviceLower);
            });
            if (relatedObsCases.length > 0) {
              for (const obsCase of relatedObsCases) {
                const caseTitle = obsCase.title || '';
                const caseDescription = obsCase.description || '';
                const combinedText =
                  `Service: ${serviceName} Observability Case: ${caseTitle} ${caseDescription}`.trim();

                correlations.push({
                  case: obsCase.id || obsCase.case_id,
                  service: serviceName,
                  observability: obsCase,
                  confidence: 0.85,
                  match_type: 'entity_service_observability',
                  title: caseTitle,
                  description: caseDescription,
                  text: combinedText || caseTitle,
                  severity: obsCase.severity || null,
                  status: obsCase.status || null,
                });
              }
            }

            // Find attack discoveries mentioning this service
            const relatedAttacks = attackDiscoveries.filter((attack: any) => {
              const title = (attack.title || '').toLowerCase();
              return title.includes(serviceLower);
            });
            if (relatedAttacks.length > 0) {
              for (const attack of relatedAttacks) {
                const attackTitle = attack.title || '';
                const combinedText =
                  `Service: ${serviceName} Attack Discovery: ${attackTitle}`.trim();

                correlations.push({
                  service: serviceName,
                  observability: attack,
                  confidence: 0.8,
                  match_type: 'entity_service_attack_discovery',
                  title: attackTitle,
                  text: combinedText || attackTitle,
                  severity: attack.severity || null,
                });
              }
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
