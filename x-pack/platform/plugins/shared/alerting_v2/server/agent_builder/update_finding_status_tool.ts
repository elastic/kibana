/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { RULE_DOCTOR_FINDINGS_INDEX } from '../resources/indices/rule_doctor_findings';

export const ALERTING_V2_UPDATE_FINDING_STATUS_TOOL_ID = `${internalNamespaces.alerting}.update_finding_status`;

const updateFindingStatusToolSchema = z.object({
  finding_id: z.string().describe('The unique identifier of the Rule Doctor finding.'),
  status: z
    .enum(['applied', 'dismissed'])
    .describe('The new status: "applied" after changes are made, "dismissed" to ignore.'),
});

export type ScopedSpaceIdResolver = (request: KibanaRequest) => string;

export const createUpdateFindingStatusTool = (
  getEsClient: () => ElasticsearchClient,
  getSpaceId: ScopedSpaceIdResolver,
  logger: Logger
): StaticToolRegistration<typeof updateFindingStatusToolSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof updateFindingStatusToolSchema> = {
    id: ALERTING_V2_UPDATE_FINDING_STATUS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Marks a Rule Doctor finding as applied or dismissed. ' +
      'Call this after successfully applying a fix (update, delete, or create) ' +
      'so the finding no longer appears as actionable.',
    schema: updateFindingStatusToolSchema,
    tags: ['alerting', 'rules', 'v2', 'rule-doctor'],
    confirmation: { askUser: 'never' },
    handler: async ({ finding_id: findingId, status }, { request }) => {
      try {
        logger.debug(`Update finding status tool invoked: ${findingId} -> ${status}`);

        const esClient = getEsClient();
        const spaceId = getSpaceId(request);

        const existing = await esClient.get<{ space_id?: string }>({
          index: RULE_DOCTOR_FINDINGS_INDEX,
          id: findingId,
          _source_includes: ['space_id'],
        });

        if (existing._source?.space_id !== spaceId) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: `Finding ${findingId} not found` },
              },
            ],
          };
        }

        await esClient.update({
          index: RULE_DOCTOR_FINDINGS_INDEX,
          id: findingId,
          doc: { status },
          refresh: 'wait_for',
        });

        logger.debug(`Successfully updated finding ${findingId} to ${status}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { success: true, findingId, status },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Update finding status tool failed for ${findingId}: ${message}`);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to update finding status: ${message}` },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
