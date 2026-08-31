/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import { ACTION_POLICY_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import {
  actionPolicyOperationSchema,
  executeActionPolicyOperations,
  ActionPolicyOperationValidationError,
} from './operations';
import { validateDestinations } from './validate_destinations';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';

const manageActionPolicySchema = z.object({
  actionPolicyAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) The action policy attachment ID to modify. If not provided, a new policy is created.'
    ),
  operations: z.array(actionPolicyOperationSchema).min(1),
});

export interface ManageActionPolicyToolDeps {
  logger: LoggerServiceContract;
  getWorkflow: (id: string, spaceId: string) => Promise<{ id: string; name?: string } | null>;
  getAvailableConnectors: (
    spaceId: string,
    request: import('@kbn/core/server').KibanaRequest
  ) => Promise<{
    connectorTypes: Record<string, { instances: Array<{ id: string; name: string }> }>;
  }>;
}

export const manageActionPolicyTool = ({
  logger,
  getWorkflow,
  getAvailableConnectors,
}: ManageActionPolicyToolDeps): BuiltinSkillBoundedTool<typeof manageActionPolicySchema> => ({
  id: ALERTING_TOOL_IDS.manageActionPolicy,
  type: ToolType.builtin,
  description: `Create or update an alerting V2 action policy (notification policy) in the conversation.

This tool only mutates the action policy attachment shown in the conversation.
It does NOT create or modify the underlying saved object — for that, direct the
user to the "Create policy" or "Update Policy" button in the rendered attachment.

Use operations[] to:
1. set_metadata — set name, description, and tags
2. set_destinations — set workflow destinations (type: 'workflow', id: '<workflow-id>')
3. set_matcher — set a KQL query to filter alert episodes, or null for catch-all. To scope a policy to a single rule, use \`rule.id: "<ruleId>"\`.
4. set_grouping — set groupingMode (per_episode | all | per_field) and groupBy fields
5. set_throttle — set throttle strategy and optional interval
6. validate — validate the accumulated policy against the API request schema; throws if not ready to save`,
  schema: manageActionPolicySchema,
  handler: async (
    { actionPolicyAttachmentId: previousAttachmentId, operations },
    { attachments, spaceId, request }
  ) => {
    let policyId: string | undefined;
    try {
      const currentAttachment = previousAttachmentId
        ? attachments.getAttachmentRecord(previousAttachmentId)
        : undefined;

      const isNew = !currentAttachment;
      const attachmentId = previousAttachmentId ?? uuidv4();

      const currentData: Partial<ActionPolicyAttachmentData> =
        currentAttachment?.versions.at(-1)?.data ?? {};
      policyId = currentAttachment?.origin;

      const updatedData = executeActionPolicyOperations(currentData, operations, {
        isNew,
      }) as ActionPolicyAttachmentData;

      if (isNew && !updatedData.id) {
        updatedData.id = uuidv4();
      }
      // Prefer persisted origin; fall back to draft / pre-assigned id (also in tool result).
      policyId = policyId ?? updatedData.id;

      if (updatedData.destinations?.length) {
        const findConnectorById = async (
          id: string
        ): Promise<{ id: string; name: string } | null> => {
          try {
            const { connectorTypes } = await getAvailableConnectors(spaceId, request);
            for (const typeInfo of Object.values(connectorTypes)) {
              const match = typeInfo.instances.find((inst) => inst.id === id);
              if (match) return { id: match.id, name: match.name };
            }
          } catch {
            // Connector lookup is best-effort for error message quality
          }
          return null;
        };

        await validateDestinations(updatedData.destinations, {
          attachments,
          workflowLookup: { getWorkflow },
          connectorLookup: { findConnectorById },
          spaceId,
        });
      }

      const attachmentInput = {
        id: attachmentId,
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        description: `Action Policy: ${updatedData.name ?? attachmentId}`,
        data: updatedData,
      };

      const attachment = isNew
        ? await attachments.add(attachmentInput)
        : await attachments.update(attachmentId, {
            data: updatedData,
            description: attachmentInput.description,
          });

      if (!attachment) {
        throw new Error(`Failed to persist action policy attachment "${attachmentId}".`);
      }

      logger.debug({
        message: () =>
          isNew ? 'Action policy attachment created' : 'Action policy attachment updated',
        labels: {
          space_id: spaceId,
          ...(policyId != null ? { policy_id: policyId } : {}),
        },
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              version: attachment.current_version ?? 1,
              actionPolicyAttachment: {
                id: attachment.id,
                policyId: updatedData.id,
                name: updatedData.name,
                destinations: updatedData.destinations,
                matcher: updatedData.matcher,
                groupingMode: updatedData.grouping_mode,
                throttle: updatedData.throttle,
              },
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof ActionPolicyOperationValidationError) {
        logger.debug({
          message: 'Invalid manage_action_policy input',
          labels: {
            space_id: spaceId,
            ...(policyId != null ? { policy_id: policyId } : {}),
          },
        });
      } else {
        logger.warn({
          message: 'Failed to manage action policy',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_ACTION_POLICY_FAILED,
          labels: {
            space_id: spaceId,
            ...(policyId != null ? { policy_id: policyId } : {}),
          },
          error,
        });
      }
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to manage action policy: ${message}`,
              metadata: { actionPolicyAttachmentId: previousAttachmentId, operations },
            },
          },
        ],
      };
    }
  },
});
