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
import type { ResolvedWorkflowDestination, WorkflowSummary } from './validate_destinations';
import { validateActionPolicyWorkflow } from './validate_workflow_compatibility';

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
  getWorkflow: (id: string, spaceId: string) => Promise<WorkflowSummary | null>;
  getAvailableConnectors: (
    spaceId: string,
    request: import('@kbn/core/server').KibanaRequest
  ) => Promise<{
    connectorTypes: Record<string, { instances: Array<{ id: string; name: string }> }>;
  }>;
}

/**
 * Runs the Alerting V2 compatibility checks over every destination we could resolve a
 * workflow definition for. Destinations without a definition are skipped: a policy
 * should never be blocked because we could not read the workflow.
 */
const collectWorkflowCompatibilityDiagnostics = (
  resolvedDestinations: ResolvedWorkflowDestination[]
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { destinationId, yaml, enabled } of resolvedDestinations) {
    if (!yaml) {
      continue;
    }
    for (const diagnostic of validateActionPolicyWorkflow(yaml, { enabled })) {
      // Prefixed so the agent can tell which workflow to fix on a multi-destination policy.
      const message = `Destination workflow "${destinationId}": ${diagnostic.message}`;
      (diagnostic.severity === 'error' ? errors : warnings).push(message);
    }
  }

  return { errors, warnings };
};

export const manageActionPolicyTool = ({
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
6. validate — validate the accumulated policy against the API request schema; throws if not ready to save

Destination workflows are also checked for compatibility with notification dispatch.
On a new policy an incompatible workflow fails the call; on an edit the issues come
back as \`warnings\` in the result.`,
  schema: manageActionPolicySchema,
  handler: async (
    { actionPolicyAttachmentId: previousAttachmentId, operations },
    { logger, attachments, spaceId, request }
  ) => {
    try {
      const currentAttachment = previousAttachmentId
        ? attachments.getAttachmentRecord(previousAttachmentId)
        : undefined;

      const isNew = !currentAttachment;
      const attachmentId = previousAttachmentId ?? uuidv4();

      const currentData: Partial<ActionPolicyAttachmentData> =
        currentAttachment?.versions.at(-1)?.data ?? {};

      const updatedData = executeActionPolicyOperations(currentData, operations, {
        isNew,
      }) as ActionPolicyAttachmentData;

      if (isNew && !updatedData.id) {
        updatedData.id = uuidv4();
      }

      let workflowWarnings: string[] = [];

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

        const resolvedDestinations = await validateDestinations(updatedData.destinations, {
          attachments,
          workflowLookup: { getWorkflow },
          connectorLookup: { findConnectorById },
          spaceId,
        });

        const { errors, warnings } = collectWorkflowCompatibilityDiagnostics(resolvedDestinations);

        // A new policy is blocked so the agent regenerates the workflow before anything
        // is shown to the user. An edit still applies, because refusing it would strand
        // the change the user asked for over a problem in a pre-existing workflow.
        if (isNew && errors.length > 0) {
          throw new ActionPolicyOperationValidationError(
            `Destination workflow is not compatible with alert notification dispatch:\n${errors.join(
              '\n'
            )}\nRegenerate the workflow with \`platform.core.generate_workflow\` (reusing the same \`workflowId\`), then retry.`
          );
        }

        workflowWarnings = [...errors, ...warnings];
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

      logger.debug(
        `Action policy attachment ${isNew ? 'created' : 'updated'}: "${updatedData.name}"`
      );

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
                groupingMode: updatedData.groupingMode,
                throttle: updatedData.throttle,
              },
              ...(workflowWarnings.length > 0 ? { warnings: workflowWarnings } : {}),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof ActionPolicyOperationValidationError) {
        logger.debug(`manage_action_policy tool: invalid input — ${message}`);
      } else {
        logger.warn(`Error in manage_action_policy tool: ${message}`);
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
