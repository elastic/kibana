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

const entityExtractionSchema = z.object({
  data: z
    .record(z.unknown())
    .describe(
      'Data from various sources (security, observability, slack, github) to extract entities from'
    ),
});

export const entityExtractionTool = (): BuiltinToolDefinition<typeof entityExtractionSchema> => {
  return {
    id: 'platform.catchup.correlation.entity_extraction',
    type: ToolType.builtin,
    description: `Extracts entities (service names, alert IDs, case IDs, PR numbers, user names) from messages, alerts, and other data sources.

This tool uses pattern matching and heuristics to identify:
- Service names (e.g., "payment-service", "api-gateway")
- Alert IDs (e.g., from security alerts)
- Case IDs (e.g., from security cases)
- PR numbers (e.g., "#123" or "PR #456" from GitHub)
- User names and mentions
- URLs and links

The extracted entities are used by the correlation engine to find relationships across different data sources.`,
    schema: entityExtractionSchema,
    handler: async ({ data }, { logger }) => {
      try {
        logger.debug('Entity extraction tool called');

        const entities: {
          service_names: string[];
          alert_ids: string[];
          case_ids: string[];
          pr_numbers: string[];
          user_names: string[];
          urls: string[];
        } = {
          service_names: [],
          alert_ids: [],
          case_ids: [],
          pr_numbers: [],
          user_names: [],
          urls: [],
        };

        // Extract entities from security data
        const securityData = data.security || data.security_summary || {};
        if (securityData.detections?.values) {
          for (const detection of securityData.detections.values) {
            if (detection.id || detection.alert_id) {
              entities.alert_ids.push(detection.id || detection.alert_id);
            }
            if (detection.service?.name) {
              entities.service_names.push(detection.service.name);
            }
          }
        }
        if (securityData.cases?.values) {
          for (const caseItem of securityData.cases.values) {
            if (caseItem.id || caseItem.case_id) {
              entities.case_ids.push(caseItem.id || caseItem.case_id);
            }
          }
        }

        // Extract entities from observability data
        const observabilityData = data.observability || {};
        if (observabilityData.top_services) {
          entities.service_names.push(...observabilityData.top_services);
        }
        if (observabilityData.alerts) {
          for (const alert of observabilityData.alerts) {
            if (alert.id || alert.alert_id) {
              entities.alert_ids.push(alert.id || alert.alert_id);
            }
            if (alert.service?.name) {
              entities.service_names.push(alert.service.name);
            }
          }
        }

        // Extract entities from Slack data
        const slackData = data.slack || data.external?.slack || {};
        const extractFromSlackMessages = (messages: any[]) => {
          for (const message of messages) {
            // Extract user names
            if (message.user_name) {
              entities.user_names.push(message.user_name);
            }
            if (message.user_real_name) {
              entities.user_names.push(message.user_real_name);
            }
            // Extract URLs
            const urlRegex = /https?:\/\/[^\s]+/g;
            const text = message.text || '';
            const urls = text.match(urlRegex);
            if (urls) {
              entities.urls.push(...urls);
            }
            // Extract PR numbers from text
            const prRegex = /(?:PR|#)\s*(\d+)/gi;
            const prMatches = text.match(prRegex);
            if (prMatches) {
              entities.pr_numbers.push(...prMatches.map((m) => m.replace(/[^\d]/g, '')));
            }
            // Extract case IDs (pattern: case ID or case-123)
            const caseRegex = /case[-\s]?(\w+)/gi;
            const caseMatches = text.match(caseRegex);
            if (caseMatches) {
              entities.case_ids.push(...caseMatches.map((m) => m.replace(/case[-\s]?/i, '')));
            }
            // Extract alert IDs (pattern: alert-123 or alert_id)
            const alertRegex = /alert[-\s]?(\w+)/gi;
            const alertMatches = text.match(alertRegex);
            if (alertMatches) {
              entities.alert_ids.push(...alertMatches.map((m) => m.replace(/alert[-\s]?/i, '')));
            }
            // Extract service names (common patterns)
            const serviceRegex = /([a-z0-9-]+-service|[a-z0-9-]+-api|[a-z0-9-]+-gateway)/gi;
            const serviceMatches = text.match(serviceRegex);
            if (serviceMatches) {
              entities.service_names.push(...serviceMatches);
            }
          }
        };

        if (slackData.userMentionMessages) {
          extractFromSlackMessages(slackData.userMentionMessages);
        }
        if (slackData.channelMessages) {
          extractFromSlackMessages(slackData.channelMessages);
        }
        if (slackData.dmMessages) {
          extractFromSlackMessages(slackData.dmMessages);
        }

        // Extract entities from GitHub data
        const githubData = data.github || data.external?.github || {};
        if (githubData.pull_requests) {
          for (const pr of githubData.pull_requests) {
            if (pr.number) {
              entities.pr_numbers.push(String(pr.number));
            }
            // Extract service names from PR title/body
            const prText = `${pr.title || ''} ${pr.body || ''}`;
            const serviceRegex = /([a-z0-9-]+-service|[a-z0-9-]+-api|[a-z0-9-]+-gateway)/gi;
            const serviceMatches = prText.match(serviceRegex);
            if (serviceMatches) {
              entities.service_names.push(...serviceMatches);
            }
          }
        }

        // Deduplicate entities
        const deduplicate = (arr: string[]) => Array.from(new Set(arr));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                entities: {
                  service_names: deduplicate(entities.service_names),
                  alert_ids: deduplicate(entities.alert_ids),
                  case_ids: deduplicate(entities.case_ids),
                  pr_numbers: deduplicate(entities.pr_numbers),
                  user_names: deduplicate(entities.user_names),
                  urls: deduplicate(entities.urls),
                },
                total_entities:
                  entities.service_names.length +
                  entities.alert_ids.length +
                  entities.case_ids.length +
                  entities.pr_numbers.length +
                  entities.user_names.length +
                  entities.urls.length,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in entity extraction tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error extracting entities: ${errorMessage}`)],
        };
      }
    },
    tags: ['correlation', 'entity-extraction'],
  };
};


