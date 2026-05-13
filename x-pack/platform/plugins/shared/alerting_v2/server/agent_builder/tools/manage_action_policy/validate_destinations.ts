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
  const workflowAttachmentIds = new Set<string>();
  const attachmentNameById = new Map<string, string>();

  for (const att of activeAttachments) {
    if (att.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) continue;
    workflowAttachmentIds.add(att.id);
    const latestVersion = att.versions.at(-1);
    const data = latestVersion?.data as { workflowId?: string; name?: string } | undefined;
    if (data?.name) {
      attachmentNameById.set(att.id, data.name);
    }
    if (data?.workflowId) {
      workflowAttachmentIds.add(data.workflowId);
      if (data.name) {
        attachmentNameById.set(data.workflowId, data.name);
      }
    }
  }

  const resolved = new Map<string, ResolvedDestination>();

  for (const dest of destinations) {
    if (workflowAttachmentIds.has(dest.id)) {
      const name = attachmentNameById.get(dest.id);
      if (name) {
        resolved.set(dest.id, { name, isDraft: true });
      }
      continue;
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
          `tool, then use the workflow's attachment ID as the destination.`
      );
    }

    throw new ActionPolicyOperationValidationError(
      `Destination ID "${dest.id}" is not a valid workflow in this space or conversation. ` +
        `Each destination must reference either a persisted workflow ID from this Kibana space, ` +
        `or an in-memory workflow attachment ID from this conversation. ` +
        `To create a workflow, use the workflow_set_yaml tool first, then use the returned ` +
        `workflow attachment ID as the destination.`
    );
  }

  return resolved;
}
