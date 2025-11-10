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
    id: 'hackathon.catchup.correlation.entity_extraction',
    type: ToolType.builtin,
    description: `Extracts entities from incidents, alerts, and other data sources.

**Entities are actual data values from alerts and incidents, NOT identifiers:**
- Host names (e.g., "payment-service-prod-01", "web-server-02")
- Service names (e.g., "payment-service", "api-gateway")
- User names (e.g., "john.doe", "admin")
- Source IPs (e.g., "192.168.1.1", "10.0.0.5")
- Destination IPs/addresses (e.g., "74.12.9.199", "payment-service-prod-01")

**NOT entities (these are identifiers, not entity values):**
- Alert IDs
- Case IDs
- PR numbers
- URLs

The extracted entities are used by the correlation engine to find relationships across different data sources based on shared entity values.`,
    schema: entityExtractionSchema,
    handler: async ({ data }, { logger }) => {
      try {
        logger.info('[Entity Extraction] Entity extraction tool called');
        logger.info(`[Entity Extraction] Input data keys: ${Object.keys(data || {}).join(', ')}`);
        logger.info(
          `[Entity Extraction] data.incident type: ${typeof data?.incident}, value preview: ${JSON.stringify(
            data?.incident
          ).substring(0, 200)}`
        );

        const entities: {
          service_names: string[];
          user_names: string[];
          host_names: string[];
          source_ips: string[];
          destination_ips: string[];
        } = {
          service_names: [],
          user_names: [],
          host_names: [],
          source_ips: [],
          destination_ips: [],
        };

        // Extract entities from the fetched incident first (highest priority)
        // Handle workflow response structure (could be stringified JSON or object)
        let incidentData: any = {};
        const incidentRaw = data.incident || {};

        logger.info(
          `[Entity Extraction] Processing incident data - type: ${typeof incidentRaw}, has results: ${
            incidentRaw && typeof incidentRaw === 'object' && 'results' in incidentRaw
          }`
        );

        // If it's a workflow response structure, extract the data
        if (
          incidentRaw &&
          typeof incidentRaw === 'object' &&
          'results' in incidentRaw &&
          Array.isArray((incidentRaw as any).results) &&
          (incidentRaw as any).results.length > 0
        ) {
          const incidentResultData = (incidentRaw as any).results[0]?.data;
          logger.info(
            `[Entity Extraction] Found workflow response structure, extracting data - type: ${typeof incidentResultData}`
          );

          // If data is a JSON string, parse it
          if (typeof incidentResultData === 'string') {
            try {
              incidentData = JSON.parse(incidentResultData);
              logger.info(
                `[Entity Extraction] Parsed JSON string, keys: ${Object.keys(incidentData).join(
                  ', '
                )}`
              );
            } catch (e) {
              logger.warn(`Entity extraction: Failed to parse incident data as JSON: ${e}`);
              incidentData = {};
            }
          } else {
            incidentData = incidentResultData || {};
            logger.info(
              `[Entity Extraction] Using direct data object, keys: ${Object.keys(incidentData).join(
                ', '
              )}`
            );
          }
        } else if (typeof incidentRaw === 'string') {
          // If it's already a JSON string, parse it
          try {
            incidentData = JSON.parse(incidentRaw);
            logger.info(
              `[Entity Extraction] Parsed incidentRaw as JSON string, keys: ${Object.keys(
                incidentData
              ).join(', ')}`
            );
          } catch (e) {
            logger.warn(`Entity extraction: Failed to parse incident data as JSON: ${e}`);
            incidentData = {};
          }
        } else {
          // Otherwise, assume it's already the data object
          incidentData = incidentRaw;
          logger.info(
            `[Entity Extraction] Using incidentRaw directly as data object, keys: ${Object.keys(
              incidentData
            ).join(', ')}`
          );
        }

        logger.info(
          `[Entity Extraction] incidentData keys: ${Object.keys(incidentData).join(
            ', '
          )}, has entities: ${!!incidentData.entities}`
        );
        if (incidentData.entities) {
          logger.info(
            `[Entity Extraction] Found entities object with keys: ${Object.keys(
              incidentData.entities
            ).join(', ')}`
          );
          logger.info(
            `[Entity Extraction] Entity counts in incidentData - hosts: ${
              incidentData.entities.host_names?.length || 0
            }, services: ${incidentData.entities.service_names?.length || 0}, users: ${
              incidentData.entities.user_names?.length || 0
            }, source_ips: ${incidentData.entities.source_ips?.length || 0}, dest_ips: ${
              incidentData.entities.destination_ips?.length || 0
            }`
          );

          // Use entities already extracted by fetch_incident tool
          // NOTE: Only extract actual entities (host names, service names, user names, IPs), NOT IDs
          if (
            incidentData.entities.service_names &&
            Array.isArray(incidentData.entities.service_names)
          ) {
            entities.service_names.push(...incidentData.entities.service_names);
            logger.info(
              `[Entity Extraction] Added ${
                incidentData.entities.service_names.length
              } service names: ${incidentData.entities.service_names.slice(0, 3).join(', ')}`
            );
          }
          if (incidentData.entities.user_names && Array.isArray(incidentData.entities.user_names)) {
            entities.user_names.push(...incidentData.entities.user_names);
            logger.info(
              `[Entity Extraction] Added ${incidentData.entities.user_names.length} user names`
            );
          }
          if (incidentData.entities.host_names && Array.isArray(incidentData.entities.host_names)) {
            entities.host_names.push(...incidentData.entities.host_names);
            logger.info(
              `[Entity Extraction] Added ${
                incidentData.entities.host_names.length
              } host names: ${incidentData.entities.host_names.join(', ')}`
            );
          }
          if (incidentData.entities.source_ips && Array.isArray(incidentData.entities.source_ips)) {
            entities.source_ips.push(...incidentData.entities.source_ips);
            logger.info(
              `[Entity Extraction] Added ${incidentData.entities.source_ips.length} source IPs`
            );
          }
          if (
            incidentData.entities.destination_ips &&
            Array.isArray(incidentData.entities.destination_ips)
          ) {
            entities.destination_ips.push(...incidentData.entities.destination_ips);
            logger.info(
              `[Entity Extraction] Added ${incidentData.entities.destination_ips.length} destination IPs`
            );
          }
          logger.info(
            `[Entity Extraction] After extracting from fetched incident - hosts=${entities.host_names.length}, services=${entities.service_names.length}, users=${entities.user_names.length}, source_ips=${entities.source_ips.length}, dest_ips=${entities.destination_ips.length}`
          );
        } else if (incidentData.found === false) {
          logger.debug(
            `Entity extraction: Incident ${
              data.incident_id || 'unknown'
            } was not found by fetch_incident tool`
          );
        } else {
          logger.warn(
            `[Entity Extraction] incidentData does not have entities property. Available keys: ${Object.keys(
              incidentData
            ).join(', ')}`
          );
        }

        // Extract entities from security data
        // NOTE: Only extract actual entities (host names, service names, user names, IPs), NOT IDs
        const securityData = (data.security || data.security_summary || {}) as any;
        if (securityData.detections?.values) {
          for (const detection of securityData.detections.values) {
            if (detection.service?.name) {
              entities.service_names.push(detection.service.name);
            }
            if (detection.host?.name) {
              entities.host_names.push(detection.host.name);
            }
            if (detection.user?.name) {
              entities.user_names.push(detection.user.name);
            }
            if (detection.source?.ip) {
              entities.source_ips.push(detection.source.ip);
            }
            if (detection.destination?.ip) {
              entities.destination_ips.push(detection.destination.ip);
            }
          }
        }

        // Extract entities from observability data
        // NOTE: Only extract actual entities (host names, service names, user names, IPs), NOT IDs
        const observabilityData = (data.observability || {}) as any;
        if (observabilityData.top_services) {
          entities.service_names.push(...observabilityData.top_services);
        }
        if (observabilityData.alerts) {
          for (const alert of observabilityData.alerts) {
            if (alert.service?.name) {
              entities.service_names.push(alert.service.name);
            }
            if (alert.host?.name) {
              entities.host_names.push(alert.host.name);
            }
            if (alert.user?.name) {
              entities.user_names.push(alert.user.name);
            }
            if (alert.source?.ip) {
              entities.source_ips.push(alert.source.ip);
            }
            if (alert.destination?.ip) {
              entities.destination_ips.push(alert.destination.ip);
            }
          }
        }

        // NOTE: incident_id is NOT an entity - it's just an identifier
        // We don't extract IDs as entities, only actual entity values (host names, service names, etc.)

        // Extract entities from Slack data
        const slackData = (data.slack || (data.external as any)?.slack || {}) as any;
        const extractFromSlackMessages = (messages: any[]) => {
          for (const message of messages) {
            // Extract user names
            if (message.user_name) {
              entities.user_names.push(message.user_name);
            }
            if (message.user_real_name) {
              entities.user_names.push(message.user_real_name);
            }
            // NOTE: URLs and PR numbers are NOT entities - they are identifiers
            // Only extract actual entity values (host names, service names, user names, IPs)
            const text = message.text || '';
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
        // NOTE: PR numbers are NOT entities - only extract actual entity values
        const githubData = (data.github || (data.external as any)?.github || {}) as any;
        if (githubData.pull_requests) {
          for (const pr of githubData.pull_requests) {
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

        const finalEntities = {
          service_names: deduplicate(entities.service_names),
          user_names: deduplicate(entities.user_names),
          host_names: deduplicate(entities.host_names),
          source_ips: deduplicate(entities.source_ips),
          destination_ips: deduplicate(entities.destination_ips),
        };

        const totalEntities =
          finalEntities.service_names.length +
          finalEntities.user_names.length +
          finalEntities.host_names.length +
          finalEntities.source_ips.length +
          finalEntities.destination_ips.length;

        logger.info(
          `[Entity Extraction] Final entity extraction result - hosts: ${
            finalEntities.host_names.length
          } (${finalEntities.host_names.join(', ')}), services: ${
            finalEntities.service_names.length
          }, users: ${finalEntities.user_names.length}, source_ips: ${
            finalEntities.source_ips.length
          }, dest_ips: ${finalEntities.destination_ips.length}, total: ${totalEntities}`
        );

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                entities: finalEntities,
                total_entities: totalEntities,
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
