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
import { getPluginServices } from '../../services/service_locator';
import { getCaseUrl, getAttackDiscoveryUrl } from '../utils/kibana_urls';
import { getSpaceId } from '../../services/service_locator';

const fetchIncidentSchema = z.object({
  incident_id: z
    .string()
    .describe('The incident ID to fetch. Can be a case ID, alert ID, or attack discovery ID.'),
});

export const fetchIncidentTool = (): BuiltinToolDefinition<typeof fetchIncidentSchema> => {
  return {
    id: 'hackathon.catchup.incident.fetch',
    type: ToolType.builtin,
    description: `Fetches a specific incident by ID. Tries to identify the incident type (case, alert, or attack discovery) and fetches it from the appropriate source. Returns the incident data along with its type and extracted entities.`,
    schema: fetchIncidentSchema,
    handler: async ({ incident_id }, { request, esClient, logger }) => {
      try {

        const { core, plugin } = getPluginServices();
        const spaceId = getSpaceId(request);
        let incident: any = null;
        let incidentType: 'case' | 'alert' | 'attack_discovery' | 'unknown' = 'unknown';
        let owner: string | null = null;

        // Try to fetch as a case (try both security and observability)
        if (plugin.getCasesClient) {
          try {
            const casesClient = await plugin.getCasesClient(request);
            const theCase = await casesClient.cases.get({
              id: incident_id,
              includeComments: true,
            });

            if (theCase) {
              incident = theCase;
              incidentType = 'case';
              owner = theCase.owner || null;
            }
          } catch (caseError: any) {
            // Case not found, continue to try other types
          }
        }

        // If not a case, try to fetch as an alert
        if (!incident && plugin.ruleRegistry) {
          // Try security alerts indices
          const securityIndices = [
            `.alerts-security.alerts-${spaceId}`,
            `.alerts-security.alerts-default`,
          ];

          for (const index of securityIndices) {
            try {
              const racClient = await plugin.ruleRegistry.getRacClientWithRequest(request);
              const alert = await racClient.get({ id: incident_id, index });

              if (alert) {
                incident = alert;
                incidentType = 'alert';
                owner = 'securitySolution';
                break;
              }
            } catch (alertError: any) {
              // Alert not found in this index, continue
            }
          }

          // Try observability alerts indices
          if (!incident) {
            const observabilityIndices = [
              `.alerts-observability.apm.alerts-${spaceId}`,
              `.alerts-observability.logs.alerts-${spaceId}`,
              `.alerts-observability.metrics.alerts-${spaceId}`,
              `.alerts-observability.uptime.alerts-${spaceId}`,
              `.alerts-observability.alerts-${spaceId}`,
            ];

            for (const index of observabilityIndices) {
              try {
                const racClient = await plugin.ruleRegistry.getRacClientWithRequest(request);
                const alert = await racClient.get({ id: incident_id, index });

                if (alert) {
                  incident = alert;
                  incidentType = 'alert';
                  owner = 'observability';
                  break;
                }
              } catch (alertError: any) {
                // Alert not found in this index, continue
              }
            }
          }
        }

        // If not found yet, try as attack discovery
        if (!incident) {
          try {
            // Attack discoveries are stored in specific indices
            const attackDiscoveryIndices = [
              `.alerts-security.attack.discovery.alerts-${spaceId}*`,
              `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}*`,
            ];

            // Use ES|QL to search for attack discovery by _id
            // Try each index pattern
            for (const indexPattern of attackDiscoveryIndices) {
              try {
                const query = `FROM ${indexPattern} METADATA _id
| WHERE _id == "${incident_id}"
| KEEP _id, kibana.alert.attack_discovery.title, kibana.alert.severity, kibana.alert.workflow_status, kibana.alert.attack_discovery.alert_ids, kibana.alert.case_ids, @timestamp, *
| LIMIT 1`;

                const esqlResult = await executeEsql({
                  query,
                  esClient: esClient.asCurrentUser,
                });

                if (esqlResult?.values && esqlResult.values.length > 0) {
                  // Convert ES|QL result to object format
                  const columns = esqlResult.columns || [];
                  const values = esqlResult.values[0] || [];
                  incident = {};
                  for (let i = 0; i < columns.length && i < values.length; i++) {
                    incident[columns[i].name] = values[i];
                  }
                  incident._id = incident_id;
                  incidentType = 'attack_discovery';
                  owner = 'securitySolution';
                break;
                }
              } catch (indexError: any) {
                // If it's an index not found error, try next pattern
                if (
                  indexError.message?.includes('Unknown index') ||
                  indexError.message?.includes('no such index')
                ) {
                  continue;
                }
                // For other errors, try next index
              }
            }
          } catch (attackError: any) {
            // Not an attack discovery, continue
          }
        }

        if (!incident) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  incident_id,
                  found: false,
                  message: `Incident ${incident_id} not found as a case, alert, or attack discovery`,
                },
              },
            ],
          };
        }

        // Extract entities from the incident
        // NOTE: Only extract actual entities (host names, service names, user names, IPs), NOT IDs
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

        if (incidentType === 'case') {
          // Fetch alerts linked to the case and extract entities from them
          // NOTE: We don't store alert IDs or case IDs as entities - only actual entity values
          // Use Cases API to get alerts with their indices
          if (plugin.getCasesClient && plugin.ruleRegistry) {
            try {
              const casesClient = await plugin.getCasesClient(request);

              const alertsResponse = await casesClient.attachments.getAllAlertsAttachToCase({
                caseId: incident_id,
              });


              if (alertsResponse.length > 0) {
                const racClient = await plugin.ruleRegistry.getRacClientWithRequest(request);

                // Fetch actual alert data using the id and index from the Cases API response
                for (const alertRef of alertsResponse.slice(0, 10)) {
                  // Limit to first 10 alerts
                  const alertId = alertRef.id;
                  const alertIndex = alertRef.index;

                  if (!alertId || !alertIndex) {
                    logger.warn(
                      `[CatchUp Agent] Alert reference missing id or index: ${JSON.stringify(
                        alertRef
                      )}`
                    );
                    continue;
                  }

                  try {
                    const alert = await racClient.get({ id: alertId, index: alertIndex });

                    if (alert) {

                      // Extract entities from alert - try multiple possible field paths
                      const serviceName =
                        alert['service.name'] ||
                        alert.service?.name ||
                        alert['kibana.alert.evaluation.conditions.service.name'];
                      if (serviceName) {
                        const value = Array.isArray(serviceName) ? serviceName[0] : serviceName;
                        if (
                          value &&
                          typeof value === 'string' &&
                          !entities.service_names.includes(value)
                        ) {
                          entities.service_names.push(value);
                        }
                      }

                      const hostName =
                        alert['host.name'] ||
                        alert.host?.name ||
                        alert['kibana.alert.evaluation.conditions.host.name'];
                      if (hostName) {
                        const value = Array.isArray(hostName) ? hostName[0] : hostName;
                        if (
                          value &&
                          typeof value === 'string' &&
                          !entities.host_names.includes(value)
                        ) {
                          entities.host_names.push(value);
                        }
                      }

                      const userName =
                        alert['user.name'] ||
                        alert.user?.name ||
                        alert['kibana.alert.evaluation.conditions.user.name'];
                      if (userName) {
                        const value = Array.isArray(userName) ? userName[0] : userName;
                        if (
                          value &&
                          typeof value === 'string' &&
                          !entities.user_names.includes(value)
                        ) {
                          entities.user_names.push(value);
                        }
                      }

                      const sourceIp =
                        alert['source.ip'] ||
                        alert.source?.ip ||
                        alert['kibana.alert.evaluation.conditions.source.ip'];
                      if (sourceIp) {
                        const value = Array.isArray(sourceIp) ? sourceIp[0] : sourceIp;
                        if (
                          value &&
                          typeof value === 'string' &&
                          !entities.source_ips.includes(value)
                        ) {
                          entities.source_ips.push(value);
                        }
                      }

                      const destIp =
                        alert['destination.ip'] ||
                        alert.destination?.ip ||
                        alert['destination.address'] ||
                        alert['kibana.alert.evaluation.conditions.destination.ip'];
                      if (destIp) {
                        const value = Array.isArray(destIp) ? destIp[0] : destIp;
                        if (
                          value &&
                          typeof value === 'string' &&
                          !entities.destination_ips.includes(value)
                        ) {
                          entities.destination_ips.push(value);
                        }
                      }

                    } else {
                      logger.warn(
                        `[CatchUp Agent] Alert ${alertId} from ${alertIndex} returned null/undefined`
                      );
                    }
                  } catch (getError: any) {
                    logger.warn(
                      `[CatchUp Agent] Could not fetch alert ${alertId} from ${alertIndex}: ${getError.message}`
                    );
                    // Continue to next alert
                  }
                }

              }
            } catch (fetchError: any) {
              logger.warn(
                `[CatchUp Agent] Could not fetch alerts for case ${incident_id}: ${fetchError.message}`
              );
            }
          }

          // Extract from case observables
          if (incident.observables) {
            for (const obs of incident.observables) {
              if (obs.type === 'hostname' && obs.value) {
                entities.host_names.push(obs.value);
              } else if (obs.type === 'user' && obs.value) {
                entities.user_names.push(obs.value);
              } else if (obs.type === 'ip' && obs.value) {
                entities.source_ips.push(obs.value);
              }
            }
          }
        } else if (incidentType === 'alert') {
          // Extract entity fields from alert
          // NOTE: We don't store alert IDs or case IDs as entities - only actual entity values
          if (incident['service.name']) {
            const value = Array.isArray(incident['service.name'])
              ? incident['service.name'][0]
              : incident['service.name'];
            if (value && !entities.service_names.includes(value)) {
              entities.service_names.push(value);
            }
          }
          if (incident['host.name']) {
            const value = Array.isArray(incident['host.name'])
              ? incident['host.name'][0]
              : incident['host.name'];
            if (value && !entities.host_names.includes(value)) {
              entities.host_names.push(value);
            }
          }
          if (incident['user.name']) {
            const value = Array.isArray(incident['user.name'])
              ? incident['user.name'][0]
              : incident['user.name'];
            if (value && !entities.user_names.includes(value)) {
              entities.user_names.push(value);
            }
          }
          if (incident['source.ip']) {
            const value = Array.isArray(incident['source.ip'])
              ? incident['source.ip'][0]
              : incident['source.ip'];
            if (value && !entities.source_ips.includes(value)) {
              entities.source_ips.push(value);
            }
          }
          if (incident['destination.ip'] || incident['destination.address']) {
            const destValue = incident['destination.ip'] || incident['destination.address'];
            const value = Array.isArray(destValue) ? destValue[0] : destValue;
            if (value && !entities.destination_ips.includes(value)) {
              entities.destination_ips.push(value);
            }
          }
        } else if (incidentType === 'attack_discovery') {
          // NOTE: Attack discoveries may reference alerts, but we don't extract IDs as entities
          // Only extract actual entity values if they exist in the attack discovery document
        }

        // Generate URL for the incident
        let url: string | null = null;
        if (incidentType === 'case' && owner) {
          url = getCaseUrl(request, core, incident_id, owner);
        } else if (incidentType === 'attack_discovery') {
          url = getAttackDiscoveryUrl(request, core, incident_id);
        }

        // Deduplicate entities
        const deduplicate = (arr: string[]) => Array.from(new Set(arr));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                incident_id,
                found: true,
                incident_type: incidentType,
                owner,
                incident,
                entities: {
                  service_names: deduplicate(entities.service_names),
                  user_names: deduplicate(entities.user_names),
                  host_names: deduplicate(entities.host_names),
                  source_ips: deduplicate(entities.source_ips),
                  destination_ips: deduplicate(entities.destination_ips),
                },
                url,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in fetch incident tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error fetching incident: ${errorMessage}`)],
        };
      }
    },
    tags: ['incident', 'fetch'],
  };
};
