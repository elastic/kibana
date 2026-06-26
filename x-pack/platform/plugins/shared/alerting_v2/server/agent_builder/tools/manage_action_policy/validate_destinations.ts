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

/**
 * Validates that every destination references a valid workflow.
 * Throws {@link ActionPolicyOperationValidationError} for invalid destinations
 * (bare attachment IDs, connector IDs, or unknown IDs).
 */
export async function validateDestinations(
  destinations: ActionPolicyDestination[],
  { attachments, workflowLookup, connectorLookup, spaceId }: ValidateDestinationsDeps
): Promise<void> {
  const activeAttachments = attachments.getActive();

  const workflowIds = new Set<string>();
  const attachmentToWorkflowId = new Map<string, string | undefined>();

  for (const att of activeAttachments) {
    if (att.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) continue;
    const latestVersion = att.versions.at(-1);
    const data = latestVersion?.data as { workflowId?: string } | undefined;
    if (data?.workflowId) {
      workflowIds.add(data.workflowId);
    }
    attachmentToWorkflowId.set(att.id, data?.workflowId);
  }

  for (const dest of destinations) {
    if (workflowIds.has(dest.id)) {
      continue;
    }

    if (attachmentToWorkflowId.has(dest.id)) {
      const correctId = attachmentToWorkflowId.get(dest.id);
      const hint = correctId
        ? ` The correct workflow ID for this attachment is "${correctId}".`
        : ` This workflow attachment has no workflowId — pass a \`workflowId\` when calling \`platform.core.generate_workflow\`.`;
      throw new ActionPolicyOperationValidationError(
        `Destination ID "${dest.id}" is a workflow attachment ID, not a workflow ID. ` +
          `Use the \`workflowId\` you passed to \`platform.core.generate_workflow\` instead of the \`attachmentId\`.` +
          hint
      );
    }

    const workflow = await workflowLookup.getWorkflow(dest.id, spaceId);
    if (workflow) {
      continue;
    }

    const connector = await connectorLookup.findConnectorById(dest.id);
    if (connector) {
      throw new ActionPolicyOperationValidationError(
        `Destination ID "${dest.id}" is a connector ("${connector.name}"), not a workflow. ` +
          `Action policy destinations must reference workflow IDs. ` +
          `To fix this: create a workflow that uses this connector via the \`platform.core.generate_workflow\` ` +
          `tool (passing a \`workflowId\`), then use that \`workflowId\` as the destination.`
      );
    }

    throw new ActionPolicyOperationValidationError(
      `Destination ID "${dest.id}" is not a valid workflow in this space or conversation. ` +
        `Each destination must reference either a persisted workflow ID from this Kibana space, ` +
        `or a \`workflowId\` passed to the \`platform.core.generate_workflow\` tool. ` +
        `To create a workflow, call \`platform.core.generate_workflow\` first (passing a \`workflowId\`), ` +
        `then use that \`workflowId\` as the destination.`
    );
  }
}
