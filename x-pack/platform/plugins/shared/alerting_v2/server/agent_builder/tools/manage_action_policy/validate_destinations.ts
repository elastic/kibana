/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { ActionPolicyOperationValidationError } from './operations';

export interface WorkflowLookup {
  getWorkflow: (id: string, spaceId: string) => Promise<{ id: string; name?: string } | null>;
}

export interface ConnectorLookup {
  findConnectorById: (id: string) => Promise<{ id: string; name: string } | null>;
}

export interface ValidateDestinationsDeps {
  attachments: AttachmentStateManager;
  workflowLookup: WorkflowLookup;
  connectorLookup: ConnectorLookup;
  spaceId: string;
}

export interface ResolvedDestination {
  name: string;
  isDraft: boolean;
}

/**
 * Validates that every destination references a valid workflow and returns
 * resolved metadata (name + draft status) for each destination.
 */
export async function validateDestinations(
  destinations: ActionPolicyDestination[],
  { attachments, workflowLookup, connectorLookup, spaceId }: ValidateDestinationsDeps
): Promise<Map<string, ResolvedDestination>> {
  const activeAttachments = attachments.getActive();

  // Build lookup maps from workflow attachments:
  // - workflowIds: workflowId → display name (for accepting valid destinations)
  // - attachmentToWorkflowId: attachment ID → workflowId (for rejecting bare attachment IDs with a helpful hint)
  const workflowIds = new Map<string, string>();
  const attachmentToWorkflowId = new Map<string, string | undefined>();

  for (const att of activeAttachments) {
    if (att.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) continue;
    const latestVersion = att.versions.at(-1);
    const data = latestVersion?.data as { workflowId?: string; name?: string } | undefined;
    if (data?.workflowId) {
      workflowIds.set(data.workflowId, data.name ?? data.workflowId);
    }
    attachmentToWorkflowId.set(att.id, data?.workflowId);
  }

  const resolved = new Map<string, ResolvedDestination>();

  for (const dest of destinations) {
    // Accept pre-assigned workflowIds from in-conversation workflow attachments
    const draftName = workflowIds.get(dest.id);
    if (draftName) {
      resolved.set(dest.id, { name: draftName, isDraft: true });
      continue;
    }

    // Reject bare attachment IDs — the agent should use workflowId instead
    if (attachmentToWorkflowId.has(dest.id)) {
      const correctId = attachmentToWorkflowId.get(dest.id);
      const hint = correctId
        ? ` The correct workflow ID for this attachment is "${correctId}".`
        : ` This workflow attachment has no workflowId — pass a \`workflowId\` when calling \`workflow_set_yaml\`.`;
      throw new ActionPolicyOperationValidationError(
        `Destination ID "${dest.id}" is a workflow attachment ID, not a workflow ID. ` +
          `Use the \`workflowId\` value from the \`workflow_set_yaml\` tool result instead of the \`attachmentId\`.` +
          hint
      );
    }

    const workflow = await workflowLookup.getWorkflow(dest.id, spaceId);
    if (workflow) {
      if (workflow.name) {
        resolved.set(dest.id, { name: workflow.name, isDraft: false });
      }
      continue;
    }

    const connector = await connectorLookup.findConnectorById(dest.id);
    if (connector) {
      throw new ActionPolicyOperationValidationError(
        `Destination ID "${dest.id}" is a connector ("${connector.name}"), not a workflow. ` +
          `Action policy destinations must reference workflow IDs. ` +
          `To fix this: create a workflow that uses this connector via the workflow_set_yaml ` +
          `tool, then use the workflow's \`workflowId\` as the destination.`
      );
    }

    throw new ActionPolicyOperationValidationError(
      `Destination ID "${dest.id}" is not a valid workflow in this space or conversation. ` +
        `Each destination must reference either a persisted workflow ID from this Kibana space, ` +
        `or a \`workflowId\` from the \`workflow_set_yaml\` tool result. ` +
        `To create a workflow, use the workflow_set_yaml tool first, then use the returned ` +
        `\`workflowId\` as the destination.`
    );
  }

  return resolved;
}
