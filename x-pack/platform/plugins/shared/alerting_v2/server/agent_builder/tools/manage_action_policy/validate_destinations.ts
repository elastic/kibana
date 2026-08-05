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

/**
 * The subset of a workflow this tool needs. Structurally satisfied by
 * `WorkflowDetailDto` from the workflows plugin, and by the `workflow.yaml`
 * conversation attachment data.
 */
export interface WorkflowSummary {
  id: string;
  name?: string;
  yaml?: string;
  enabled?: boolean;
}

export interface WorkflowLookup {
  getWorkflow: (id: string, spaceId: string) => Promise<WorkflowSummary | null>;
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
 * A destination whose workflow was located, along with the workflow definition we
 * found. `yaml` is absent when the source didn't carry one, in which case callers
 * must skip content-level validation rather than treat it as a failure.
 */
export interface ResolvedWorkflowDestination {
  destinationId: string;
  /** Whether the workflow came from this conversation or from the space. */
  source: 'attachment' | 'persisted';
  yaml?: string;
  enabled?: boolean;
}

/**
 * Validates that every destination references a valid workflow, and returns the
 * workflow definition behind each one so callers can validate its content.
 *
 * Throws {@link ActionPolicyOperationValidationError} for invalid destinations
 * (bare attachment IDs, connector IDs, or unknown IDs).
 */
export async function validateDestinations(
  destinations: ActionPolicyDestination[],
  { attachments, workflowLookup, connectorLookup, spaceId }: ValidateDestinationsDeps
): Promise<ResolvedWorkflowDestination[]> {
  const activeAttachments = attachments.getActive();

  const attachedWorkflows = new Map<string, WorkflowSummary>();
  const attachmentToWorkflowId = new Map<string, string | undefined>();

  for (const att of activeAttachments) {
    if (att.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) continue;
    const latestVersion = att.versions.at(-1);
    const data = latestVersion?.data as { workflowId?: string; yaml?: string } | undefined;
    if (data?.workflowId) {
      attachedWorkflows.set(data.workflowId, { id: data.workflowId, yaml: data.yaml });
    }
    attachmentToWorkflowId.set(att.id, data?.workflowId);
  }

  const resolved: ResolvedWorkflowDestination[] = [];

  for (const dest of destinations) {
    const attached = attachedWorkflows.get(dest.id);
    if (attached) {
      resolved.push({ destinationId: dest.id, source: 'attachment', yaml: attached.yaml });
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
      resolved.push({
        destinationId: dest.id,
        source: 'persisted',
        yaml: workflow.yaml,
        enabled: workflow.enabled,
      });
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

  return resolved;
}
