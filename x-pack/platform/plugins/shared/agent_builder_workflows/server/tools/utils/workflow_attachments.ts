/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_CHANGED_EVENT,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '@kbn/workflows/common/constants';

export const extractConversationId = (context: ToolHandlerContext): string | undefined => {
  const agentEntry = context.runContext.stack.findLast((entry) => entry.type === 'agent');
  return agentEntry && 'conversationId' in agentEntry ? agentEntry.conversationId : undefined;
};

interface EmitWorkflowDiffInput {
  beforeYaml: string;
  afterYaml: string;
  proposalId: string;
  workflowId?: string;
  name?: string;
  description?: string;
  toolId: string;
}

export const emitWorkflowDiff = async (
  context: ToolHandlerContext,
  existingAttachmentId: string | undefined,
  input: EmitWorkflowDiffInput
): Promise<{
  attachmentId: string;
  diffAttachmentId: string;
  attachmentVersion: number | undefined;
}> => {
  const diffAttachment = await context.attachments.add({
    type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    data: {
      beforeYaml: input.beforeYaml,
      afterYaml: input.afterYaml,
      proposalId: input.proposalId,
      workflowId: input.workflowId,
      name: input.name,
    },
    description: input.description ?? 'Proposed workflow change',
  });

  const attachmentData = { yaml: input.afterYaml, workflowId: input.workflowId, name: input.name };

  let attachmentId: string;
  let attachmentVersion: number | undefined;

  if (existingAttachmentId) {
    const updated = await context.attachments.update(existingAttachmentId, {
      data: attachmentData,
    });
    attachmentId = existingAttachmentId;
    attachmentVersion = updated?.current_version;
  } else {
    const created = await context.attachments.add({
      type: WORKFLOW_YAML_ATTACHMENT_TYPE,
      data: attachmentData,
      description: input.name ?? 'Workflow',
    });
    attachmentId = created.id;
    attachmentVersion = created.current_version;
  }

  context.events.sendUiEvent(WORKFLOW_YAML_CHANGED_EVENT, {
    proposalId: input.proposalId,
    beforeYaml: input.beforeYaml,
    afterYaml: input.afterYaml,
    // Stable per-editor id the client scopes edits by (works when workflowId
    // is undefined on /workflows/create). See AttachmentBridge.
    attachmentId,
    workflowId: input.workflowId,
    name: input.name,
    attachmentVersion,
    toolId: input.toolId,
  });

  return { attachmentId, diffAttachmentId: diffAttachment.id, attachmentVersion };
};
