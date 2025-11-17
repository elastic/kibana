/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertAttachmentData } from '@kbn/onechat-common/attachments';
import { AttachmentType, alertAttachmentDataSchema } from '@kbn/onechat-common/attachments';
import { platformCoreTools } from '@kbn/onechat-common/tools';
import type { AttachmentTypeDefinition } from '@kbn/onechat-server/attachments';

/**
 * Creates the definition for the `alert` attachment type.
 */
export const createAlertAttachmentType = (): AttachmentTypeDefinition<
  AttachmentType.alert,
  AlertAttachmentData
> => {
  return {
    id: AttachmentType.alert,
    validate: (input) => {
      const parseResult = alertAttachmentDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      } else {
        return { valid: false, error: parseResult.error.message };
      }
    },
    format: (attachment) => {
      return {
        getRepresentation: () => {
          return { type: 'text', value: formatAlertData(attachment.data) };
        },
      };
    },
    getTools: () => [platformCoreTools.search],
    getAgentDescription: () => {
      return `Alert attachments contain security alert data. When using the search tool with alert attachments, use the "index" parameter to specify the index pattern. Do NOT include index patterns or "_index" filters in the query string itself. Before making additional searches, analyze existing alert data and previous search results to avoid redundant queries.`;
    },
  };
};

/**
 * Essential fields to include in alert attachments to reduce token usage.
 * These fields provide the most important context for security analysis.
 */
const ESSENTIAL_ALERT_FIELDS = new Set([
  '@timestamp',
  'kibana.alert.original_time',
  'kibana.alert.rule.name',
  'kibana.alert.rule.description',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
  'host.name',
  'user.name',
  'source.ip',
  'destination.ip',
  'event.category',
  'event.action',
  'message',
  '_id',
]);

/**
 * Filters alert data to include only essential fields to reduce token usage.
 *
 * @param alertData - The raw alert data string (comma-separated key-value pairs, newline-delimited)
 * @returns Filtered alert data string with only essential fields
 */
const filterEssentialFields = (alertData: string): string => {
  const lines = alertData.split('\n').filter((line) => line.trim().length > 0);
  const filteredLines: string[] = [];

  for (const line of lines) {
    const commaIndex = line.indexOf(',');
    if (commaIndex > 0) {
      const key = line.substring(0, commaIndex).trim();
      // Include essential fields and any field that starts with kibana.alert (for completeness)
      if (ESSENTIAL_ALERT_FIELDS.has(key) || key.startsWith('kibana.alert.')) {
        filteredLines.push(line);
      }
    }
  }

  return filteredLines.join('\n');
};

/**
 * Formats alert data with minimal context about the index pattern.
 * The alert data is filtered to include only essential fields to reduce token usage.
 *
 * @param data - The alert attachment data containing indexPattern and alert string
 * @returns Formatted string representation of the alert
 */
const formatAlertData = (data: AlertAttachmentData): string => {
  const filteredAlert = filterEssentialFields(data.alert);
  
  // Extract alert ID if available
  const alertIdMatch = data.alert.match(/_id,([^\n]+)/);
  const alertId = alertIdMatch ? alertIdMatch[1] : null;
  
  return `SECURITY ALERT DATA (ALREADY PROVIDED)

${filteredAlert}

CRITICAL: This alert is already provided above. DO NOT query for this exact alert (matching host.name, user.name, source.ip, destination.ip, or _id="${alertId || 'N/A'}").

ONLY search if the user explicitly requests related alerts or additional context. Do NOT automatically search for related data unless specifically asked.

When searching:
- Use index "${data.indexPattern}" as the "index" parameter (NOT in query string)
- Use KEEP command for field filtering to reduce response size
- Exclude _id="${alertId || 'N/A'}" from results`;
};

