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
    description: `Generates a unified digest from correlated catchup data. **DO NOT use this tool for simple catch-up queries.** This tool is ONLY for generating summaries AFTER you have already called the correlation engine (platform.catchup.correlation.engine) and have correlated data to format.
    
**When to use this tool:**
- ONLY after calling platform.catchup.correlation.engine and receiving correlated results
- When you need to format correlated data from multiple sources (Security + Observability + External) into a unified summary

**When NOT to use this tool:**
- For simple catch-up queries - use the specific summary tools instead:
  - "catch me up on security" → use platform.catchup.security.summary
  - "catch me up on observability" → use platform.catchup.observability.summary
  - "catch me up on slack" → use platform.catchup.external.slack
- When you don't have correlated data from the correlation engine

**Required parameter:** correlatedData (object) - Must contain correlated results from the correlation engine. This is a REQUIRED parameter - do not call this tool without it.

Output can be in markdown (human-readable) or JSON (structured) format.`,
    schema: summaryGeneratorSchema,
    handler: async ({ correlatedData, format = 'markdown' }, { logger }) => {
      try {
        logger.debug(`summary generator tool called with format: ${format}`);

        // Recursively search for a key in an object tree
        const findNestedKey = (obj: any, key: string, maxDepth: number = 5, currentDepth: number = 0): any => {
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
              if (parsed && typeof parsed === 'object' && parsed.results && Array.isArray(parsed.results)) {
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
              logger.warn(`Failed to parse value as JSON: ${e}, value preview: ${value.substring(0, 200)}`);
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

        // Comprehensive logging to capture the exact structure received from workflow template engine
        logger.info(`==> Summary Generator: correlationsRaw received - type: ${typeof correlationsRaw}, isArray: ${Array.isArray(correlationsRaw)}`);
        if (typeof correlationsRaw === 'string') {
          logger.info(`==> Summary Generator: correlationsRaw is string, length: ${correlationsRaw.length}, preview: ${correlationsRaw.substring(0, 500)}`);
        } else if (correlationsRaw && typeof correlationsRaw === 'object') {
          logger.info(`==> Summary Generator: correlationsRaw is object, keys: ${Object.keys(correlationsRaw).join(', ')}, JSON preview: ${JSON.stringify(correlationsRaw).substring(0, 500)}`);
        }

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
          logger.info(`==> Summary Generator: correlationsRaw is already an array with ${correlations.length} items`);
        } else {
          const extracted = extractDataFromResponse(correlationsRaw);
          logger.info(`==> Summary Generator: After extractDataFromResponse - type: ${typeof extracted}, isArray: ${Array.isArray(extracted)}`);
          
          if (Array.isArray(extracted)) {
            correlations = extracted;
            logger.info(`==> Summary Generator: Extracted array with ${correlations.length} items`);
          } else if (extracted && typeof extracted === 'object') {
            // First try direct access to common locations
            if (extracted.correlations && Array.isArray(extracted.correlations)) {
              correlations = extracted.correlations;
              logger.info(`==> Summary Generator: Found correlations array with ${correlations.length} items at extracted.correlations`);
            } else if (extracted.prioritized_items && Array.isArray(extracted.prioritized_items)) {
              correlations = extracted.prioritized_items;
              logger.info(`==> Summary Generator: Found prioritized_items array with ${correlations.length} items`);
            } else {
              // Recursively search for correlations array anywhere in the object tree
              logger.info(`==> Summary Generator: No direct correlations found, searching recursively...`);
              const foundCorrelations = findNestedKey(extracted, 'correlations');
              if (foundCorrelations && Array.isArray(foundCorrelations)) {
                correlations = foundCorrelations;
                logger.info(`==> Summary Generator: Found correlations array recursively with ${correlations.length} items`);
              } else {
                // Try searching for prioritized_items as well
                const foundPrioritized = findNestedKey(extracted, 'prioritized_items');
                if (foundPrioritized && Array.isArray(foundPrioritized)) {
                  correlations = foundPrioritized;
                  logger.info(`==> Summary Generator: Found prioritized_items array recursively with ${correlations.length} items`);
                } else {
                  // Log what we found for debugging
                  logger.warn(`==> Summary Generator: No correlations array found anywhere. Top-level keys: ${Object.keys(extracted).join(', ')}`);
                  logger.warn(`==> Summary Generator: Extracted object structure (first 1000 chars): ${JSON.stringify(extracted).substring(0, 1000)}`);
                }
              }
            }
          } else {
            logger.warn(`==> Summary Generator: Extracted value is not an array or object: ${typeof extracted}, value: ${String(extracted).substring(0, 200)}`);
          }
        }
        
        // Fallback: if no correlations found, check if they're in reranker output
        if (correlations.length === 0) {
          logger.info(`==> Summary Generator: No correlations found in expected location, checking for reranker output...`);
          const rerankerOutput = correlatedData.prioritize_with_reranker || correlatedData.reranker_output;
          if (rerankerOutput) {
            const rerankerExtracted = extractDataFromResponse(rerankerOutput);
            if (rerankerExtracted?.prioritized_items && Array.isArray(rerankerExtracted.prioritized_items)) {
              correlations = rerankerExtracted.prioritized_items;
              logger.info(`==> Summary Generator: Found correlations in reranker output: ${correlations.length} items`);
            } else {
              // Try recursive search in reranker output
              const found = findNestedKey(rerankerExtracted, 'correlations') || findNestedKey(rerankerExtracted, 'prioritized_items');
              if (found && Array.isArray(found)) {
                correlations = found;
                logger.info(`==> Summary Generator: Found correlations in reranker output recursively: ${correlations.length} items`);
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
        
        // Final debug logging
        logger.info(`==> Summary Generator: Total correlations extracted: ${correlations.length}`);
        logger.info(`==> Summary Generator: Correlations with Slack messages: ${correlations.filter((c: any) => c.slack).length}`);
        logger.info(`==> Summary Generator: Total correlated Slack message count: ${correlatedSlackCount}`);
        if (correlations.length > 0) {
          logger.info(`==> Summary Generator: Correlation types: ${correlations.map((c: any) => c.match_type).join(', ')}`);
          logger.info(`==> Summary Generator: Sample correlation: ${JSON.stringify({
            match_type: correlations[0].match_type,
            has_slack: !!correlations[0].slack,
            slack_count: correlations[0].slack?.length || 0,
            case: correlations[0].case || 'none',
            alert: correlations[0].alert || 'none',
          })}`);
        } else {
          logger.warn(`==> Summary Generator: WARNING - No correlations found, but correlatedSlackCount is ${correlatedSlackCount}`);
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

        // Build a more useful summary with actionable insights
        const hasHighSeverityDetections = (detections?.detections_by_severity?.high || detections?.by_severity?.high || 0) > 0;
        const hasCriticalSeverityDetections = (detections?.detections_by_severity?.critical || detections?.by_severity?.critical || 0) > 0;
        const hasOpenCases = cases?.cases?.some((c: any) => c.status === 'open') || cases?.values?.some((c: any) => c.status === 'open') || false;
        const criticalCases = (cases?.cases || cases?.values || []).filter((c: any) => 
          c.severity === 'critical' || c.severity === 'high' || (c.total_alerts && c.total_alerts > 10)
        );
        
        // Extract sample alerts and entities from detections
        const sampleAlerts = detections?.sample_alerts || [];
        const entities = detections?.entities || {};
        const criticalAlerts = sampleAlerts.filter((a: any) => a.severity === 'critical' || a.severity === 'high');
        
        // Build Security section with proper formatting
        const securityItems: string[] = [];
        if (attackDiscoveries) {
          securityItems.push(`- **${attackDiscoveries.total || 0} new attack discoveries**`);
        }
        if (detections) {
          const detectionsText = `- **${detections.total || detections.detections_total || 0} detections** (${
            detections.detections_by_severity?.high || detections.by_severity?.high || 0
          } high, ${detections.detections_by_severity?.low || detections.by_severity?.low || 0} low)${hasHighSeverityDetections ? ' ⚠️' : ''}${hasCriticalSeverityDetections ? ' 🚨' : ''}`;
          securityItems.push(detectionsText);
        }
        if (cases) {
          securityItems.push(`- **${cases.total || 0} updated cases**${hasOpenCases ? ' (some open)' : ''}`);
        }
        if (criticalCases.length > 0) {
          securityItems.push(`- **${criticalCases.length} critical/high severity case(s)** requiring attention`);
        }
        if (ruleChanges) {
          securityItems.push(`- ${ruleChanges.total || 0} rule changes`);
        }
        
        // Build critical alerts section
        let criticalAlertsSection = '';
        if (criticalAlerts.length > 0) {
          criticalAlertsSection = `\n### Critical/High Severity Alerts\n*Top ${criticalAlerts.length} critical/high severity alerts with entity information:*\n\n`;
          criticalAlertsSection += criticalAlerts.map((alert: any, idx: number) => {
            const ruleName = alert['kibana.alert.rule.name'] || 'Unknown Rule';
            const severity = alert.severity || 'unknown';
            const reason = alert['kibana.alert.reason'] || '';
            const timestamp = alert['@timestamp'] ? new Date(alert['@timestamp']).toLocaleString() : '';
            const hostName = alert['host.name'] || '';
            const userName = alert['user.name'] || '';
            const sourceIp = alert['source.ip'] || '';
            const destIp = alert['destination.ip'] || '';
            const eventAction = alert['event.action'] || '';
            const eventCategory = alert['event.category'] || '';
            
            let alertText = `${idx + 1}. **${ruleName}** (${severity})\n`;
            if (reason) {
              alertText += `   - Reason: ${reason.substring(0, 200)}${reason.length > 200 ? '...' : ''}\n`;
            }
            if (hostName) alertText += `   - Host: ${hostName}\n`;
            if (userName) alertText += `   - User: ${userName}\n`;
            if (sourceIp) alertText += `   - Source IP: ${sourceIp}\n`;
            if (destIp) alertText += `   - Destination IP: ${destIp}\n`;
            if (eventAction || eventCategory) {
              alertText += `   - Event: ${eventCategory ? `${eventCategory}` : ''}${eventAction ? `/${eventAction}` : ''}\n`;
            }
            if (timestamp) alertText += `   - Time: ${timestamp}\n`;
            return alertText;
          }).join('\n');
        }
        
        // Build entities section
        let entitiesSection = '';
        if (Object.keys(entities).length > 0 && (entities.hosts?.length > 0 || entities.users?.length > 0 || entities.source_ips?.length > 0 || entities.destination_ips?.length > 0)) {
          entitiesSection = `\n### Entities Involved\n`;
          if (entities.hosts?.length > 0) {
            entitiesSection += `- **Hosts**: ${entities.hosts.join(', ')}${entities.hosts.length >= 10 ? ' (and more)' : ''}\n`;
          }
          if (entities.users?.length > 0) {
            entitiesSection += `- **Users**: ${entities.users.join(', ')}${entities.users.length >= 10 ? ' (and more)' : ''}\n`;
          }
          if (entities.source_ips?.length > 0) {
            entitiesSection += `- **Source IPs**: ${entities.source_ips.join(', ')}${entities.source_ips.length >= 10 ? ' (and more)' : ''}\n`;
          }
          if (entities.destination_ips?.length > 0) {
            entitiesSection += `- **Destination IPs**: ${entities.destination_ips.join(', ')}${entities.destination_ips.length >= 10 ? ' (and more)' : ''}\n`;
          }
        }
        
        const markdown = `# Elastic CatchUp Summary

## Security
${securityItems.join('\n')}${criticalAlertsSection}${entitiesSection}

${
          observability.total_alerts ||
          observability.open_alerts ||
          observability.resolved_alerts ||
          observability.top_services
            ? `## Observability
${observability.total_alerts ? `- ${observability.total_alerts} total alerts` : ''}
${observability.open_alerts ? `- ${observability.open_alerts} open alerts` : ''}
${observability.resolved_alerts ? `- ${observability.resolved_alerts} resolved alerts` : ''}
${observability.top_services ? `- Top services: ${observability.top_services.join(', ')}` : ''}

`
            : ''
        }
${
          search.total_queries || search.avg_ctr
            ? `## Search
${search.total_queries ? `- ${search.total_queries} queries` : ''}
${search.avg_ctr ? `- Average CTR: ${search.avg_ctr.toFixed(2)}%` : ''}

`
            : ''
        }

${
          external.github?.pull_requests?.length ||
          external.slack ||
          external.gmail?.emails?.length
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
                    logger.info(`==> Summary Generator: Found correlation with ${corr.slack.length} Slack messages, match_type: ${corr.match_type}`);
                    correlatedSlackMessages.push(...corr.slack);
                  }
                });
                logger.info(`==> Summary Generator: Total correlated Slack messages collected: ${correlatedSlackMessages.length}`);
                
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
                        const textPreview = (msg.text || msg.message || '').substring(0, 200).replace(/\n/g, ' ');
                        const user = msg.user || msg.username || msg.user_name || '';
                        const timestamp = msg.ts ? new Date(parseFloat(msg.ts) * 1000).toLocaleString() : '';
                        slackSection += `  - [${channel}](${permalink})${user ? ` by @${user}` : ''}${timestamp ? ` (${timestamp})` : ''}\n`;
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
        logger.info(`==> Summary Generator: Building correlations section with ${correlations.length} correlations`);
        logger.info(`==> Summary Generator: CRITICAL - About to build correlations section. Correlations array length: ${correlations.length}`);
        let correlationText = `- **${correlations.length} correlated events found**\n\n`;

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
            const caseData = cases.cases?.find((c: any) => c.id === caseId) || cases.values?.find((c: any) => c.id === caseId);
            const caseTitle = corr.title || caseData?.title || caseId;
            const caseDescription = corr.description || caseData?.description || '';
            const caseUrl = caseData?.url || '';
            const severity = corr.severity || caseData?.severity || '';
            const status = corr.status || caseData?.status || '';
            const confidence = corr.confidence ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)` : '';
            const slackMessages = corr.slack || [];
            
            correlationText += `- **Case**: [${caseTitle}](${caseUrl})${confidence}\n`;
            if (caseDescription) {
              correlationText += `  - Description: ${caseDescription.substring(0, 200)}${caseDescription.length > 200 ? '...' : ''}\n`;
            }
            if (severity || status) {
              correlationText += `  - Status: ${status || 'unknown'} | Severity: ${severity || 'unknown'}\n`;
            }
            correlationText += `  - **Slack Messages** (${slackMessages.length}):\n`;
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || msg.message || '').substring(0, 150).replace(/\n/g, ' ');
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
            const caseData = caseId ? (cases.cases?.find((c: any) => c.id === caseId) || cases.values?.find((c: any) => c.id === caseId)) : null;
            const caseTitle = corr.title || caseData?.title || caseId || 'Unknown Case';
            const caseUrl = caseData?.url || '';
            const confidence = corr.confidence ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)` : '';
            const slackMessages = corr.slack || [];
            
            correlationText += `- **Alert**: ${alertId}${confidence}\n`;
            if (caseId && caseData) {
              correlationText += `  - **Case**: [${caseTitle}](${caseUrl})\n`;
            }
            correlationText += `  - **Slack Messages** (${slackMessages.length}):\n`;
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || msg.message || '').substring(0, 150).replace(/\n/g, ' ');
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
            const caseData = caseId ? (cases.cases?.find((c: any) => c.id === caseId) || cases.values?.find((c: any) => c.id === caseId)) : null;
            const confidence = corr.confidence ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)` : '';
            const slackMessages = corr.slack || [];
            
            correlationText += `- **Attack Discovery**: ${attackTitle}${confidence}\n`;
            if (caseId && caseData) {
              correlationText += `  - **Related Case**: [${caseData.title}](${caseData.url || ''})\n`;
            }
            correlationText += `  - **Slack Messages** (${slackMessages.length}):\n`;
            for (const msg of slackMessages) {
              const channel = msg.channel || 'unknown';
              const permalink = msg.permalink || '';
              const textPreview = (msg.text || msg.message || '').substring(0, 150).replace(/\n/g, ' ');
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
            const caseData = cases.cases?.find((c: any) => c.id === caseId) || cases.values?.find((c: any) => c.id === caseId);
            const caseTitle = corr.title || caseData?.title || caseId;
            const caseDescription = corr.description || caseData?.description || '';
            const caseUrl = caseData?.url || '';
            const severity = corr.severity || caseData?.severity || '';
            const status = corr.status || caseData?.status || '';
            const alertCount = caseData?.total_alerts || 0;
            const confidence = corr.confidence ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)` : '';
            const createdAt = caseData?.created_at || '';
            const updatedAt = caseData?.updated_at || caseData?.updatedAt || '';
            
            // Find Slack messages discussing this case
            const relatedSlackMessages = [
              ...slackCaseCorrelations.filter((c: any) => c.case === caseId).flatMap((c: any) => c.slack || []),
              ...slackAlertCorrelations.filter((c: any) => c.case === caseId).flatMap((c: any) => c.slack || []),
            ];
            
            correlationText += `- **[${caseTitle}](${caseUrl})**${confidence}\n`;
            if (caseDescription) {
              correlationText += `  - Description: ${caseDescription.substring(0, 200)}${caseDescription.length > 200 ? '...' : ''}\n`;
            }
            if (severity || status) {
              correlationText += `  - Status: ${status || 'unknown'} | Severity: ${severity || 'unknown'}\n`;
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
                const textPreview = (msg.text || msg.message || '').substring(0, 120).replace(/\n/g, ' ');
                const user = msg.user || msg.username || '';
                correlationText += `    - [${channel}](${permalink})${user ? ` by @${user}` : ''} - "${textPreview}${textPreview.length >= 120 ? '...' : ''}"\n`;
              }
              if (relatedSlackMessages.length > 3) {
                correlationText += `    - ... and ${relatedSlackMessages.length - 3} more message(s)\n`;
              }
            }
            
            if (createdAt || updatedAt) {
              const dateInfo = updatedAt ? `Last updated: ${new Date(updatedAt).toLocaleString()}` : 
                              createdAt ? `Created: ${new Date(createdAt).toLocaleString()}` : '';
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
            const confidence = corr.confidence ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)` : '';
            correlationText += `- **Service: ${serviceName}**${confidence}\n`;
            
            if (corr.github && corr.github.length > 0) {
              correlationText += `  - **GitHub PRs** (${corr.github.length}):\n`;
              for (const pr of corr.github.slice(0, 3)) {
                const prTitle = pr.title || 'Untitled PR';
                const prUrl = pr.html_url || pr.url || '';
                const prBody = (pr.body || '').substring(0, 150);
                correlationText += `    - [${prTitle}](${prUrl})${prBody ? ` - ${prBody}${prBody.length >= 150 ? '...' : ''}` : ''}\n`;
              }
            }
            
            if (corr.slack && corr.slack.length > 0) {
              correlationText += `  - **Slack Messages** (${corr.slack.length}):\n`;
              for (const msg of corr.slack.slice(0, 3)) {
                const channel = msg.channel || 'unknown';
                const permalink = msg.permalink || '';
                const textPreview = (msg.text || msg.message || '').substring(0, 100);
                correlationText += `    - [${channel}](${permalink}) - "${textPreview}${textPreview.length >= 100 ? '...' : ''}"\n`;
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
            const confidence = corr.confidence ? ` (confidence: ${(corr.confidence * 100).toFixed(0)}%)` : '';
            correlationText += `- **Alert**: ${alertId}${confidence}\n`;
            
            if (corr.slack && corr.slack.length > 0) {
              correlationText += `  - **Slack Messages** (${corr.slack.length}):\n`;
              for (const msg of corr.slack.slice(0, 3)) {
                const channel = msg.channel || 'unknown';
                const permalink = msg.permalink || '';
                const textPreview = (msg.text || msg.message || '').substring(0, 100);
                correlationText += `    - [${channel}](${permalink}) - "${textPreview}${textPreview.length >= 100 ? '...' : ''}"\n`;
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
            'exact_case_alert': 'Cases with linked alerts',
            'slack_case_url': 'Slack messages mentioning cases',
            'slack_alert_url': 'Slack messages mentioning alerts',
            'slack_attack_discovery_url': 'Slack messages mentioning attack discoveries',
            'entity_service': 'Service-related correlations across sources',
            'entity_alert_id': 'Alerts mentioned in external sources',
          };
          
          if (correlationTypes.size > 0) {
            const typeList = Array.from(correlationTypes).map((type) => {
              const description = typeDescriptions[type] || type;
              return `${type} (${description})`;
            }).join(', ');
            correlationText += `- **Correlation types**: ${typeList}\n`;
          }
          
          // Show what was found
          if (mentionedCases.size > 0) {
            const caseTitles = Array.from(mentionedCases).map((caseId) => {
              const caseData = cases.cases?.find((c: any) => c.id === caseId) || cases.values?.find((c: any) => c.id === caseId);
              return caseData?.title || caseId;
            }).slice(0, 5);
            correlationText += `- **Cases found**: ${caseTitles.join(', ')}${mentionedCases.size > 5 ? ` (and ${mentionedCases.size - 5} more)` : ''}\n`;
          }
          
          if (mentionedAlerts.size > 0) {
            correlationText += `- **Alerts mentioned**: ${mentionedAlerts.size} alert(s)\n`;
          }
          
          if (mentionedServices.size > 0) {
            correlationText += `- **Services mentioned**: ${Array.from(mentionedServices).join(', ')}\n`;
          }
          
          // Count Slack messages in correlations
          const slackMessageCount = correlations.reduce((count: number, corr: any) => {
            return count + (corr.slack?.length || 0);
          }, 0);
          if (slackMessageCount > 0) {
            correlationText += `- **Slack discussions**: ${slackMessageCount} message(s) linked to security events\n`;
          }
          
          const avgConfidence = correlations
            .filter((c: any) => c.confidence)
            .reduce((sum: number, c: any) => sum + (c.confidence || 0), 0) / 
            correlations.filter((c: any) => c.confidence).length;
          if (avgConfidence > 0 && !isNaN(avgConfidence)) {
            correlationText += `- **Average confidence**: ${(avgConfidence * 100).toFixed(0)}%\n`;
          }
        }

        logger.info(`==> Summary Generator: CRITICAL - Built correlations section text, length: ${correlationText.length} characters`);
        logger.info(`==> Summary Generator: CRITICAL - Correlations section preview (first 500 chars): ${correlationText.substring(0, 500)}`);
        return correlationText;
      })()
    : (() => {
        logger.warn(`==> Summary Generator: WARNING - No correlations found (correlations.length = ${correlations.length}), showing "No correlations found" message`);
        return '- No correlations found';
      })()
}

`;

        // CRITICAL: Log the final markdown to verify Correlations section is included
        const hasCorrelationsSection = markdown.includes('## Correlations');
        const correlationsCount = (markdown.match(/## Correlations/g) || []).length;
        logger.info(`==> Summary Generator: CRITICAL CHECK - Final markdown length: ${markdown.length} characters`);
        logger.info(`==> Summary Generator: CRITICAL CHECK - Final markdown includes "## Correlations": ${hasCorrelationsSection}`);
        logger.info(`==> Summary Generator: CRITICAL CHECK - Number of "## Correlations" headers found: ${correlationsCount}`);
        logger.info(`==> Summary Generator: CRITICAL CHECK - Correlations array length when building markdown: ${correlations.length}`);
        
        if (hasCorrelationsSection) {
          const correlationsSectionIndex = markdown.indexOf('## Correlations');
          const correlationsSectionPreview = markdown.substring(correlationsSectionIndex, Math.min(correlationsSectionIndex + 800, markdown.length));
          logger.info(`==> Summary Generator: CRITICAL - Correlations section found at index ${correlationsSectionIndex}`);
          logger.info(`==> Summary Generator: CRITICAL - Correlations section preview (800 chars): ${correlationsSectionPreview}`);
          // Log the end of the markdown to verify it's complete
          const markdownEnd = markdown.substring(Math.max(0, markdown.length - 300));
          logger.info(`==> Summary Generator: Markdown ends with (last 300 chars): ${markdownEnd}`);
        } else {
          logger.error(`==> Summary Generator: ERROR - Correlations section NOT found in final markdown! Markdown length: ${markdown.length}`);
          logger.error(`==> Summary Generator: ERROR - Correlations array had ${correlations.length} items but section is missing!`);
          logger.error(`==> Summary Generator: ERROR - Markdown ends with: ${markdown.substring(Math.max(0, markdown.length - 200))}`);
          // FORCE ADD the correlations section if it's missing but correlations exist
          if (correlations.length > 0) {
            logger.error(`==> Summary Generator: ERROR RECOVERY - Forcing correlations section into markdown!`);
            markdown += `\n\n## Correlations\n- **${correlations.length} correlated events found**\n- Correlation types: ${correlations.map((c: any) => c.match_type).join(', ')}\n`;
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
