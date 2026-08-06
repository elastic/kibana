/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENT_REF_ACTOR, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  AI_INDEX_ATTACHMENT_TYPE,
  WORKFLOW_YAML_ATTACHMENT_TYPE,
} from '@kbn/context-engine-plugin/common/agent_builder_attachments';
import { MAX_AI_INDEX_AUTOMATIONS } from '@kbn/context-engine-plugin/common/constants';
import {
  AiIndexConflictError,
  AiIndexManagedError,
  AiIndexNotFoundError,
} from '@kbn/context-engine-plugin/server/ai_indices/errors';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';

export interface SaveAutomationParams {
  workflowAttachmentId?: string;
  workflowId?: string;
  aiIndexId?: string;
}

export interface SaveAutomationResult {
  aiIndexId: string;
  workflowId: string;
  status: 'saved_and_attached' | 'attached' | 'already_attached';
}

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface WorkflowYamlAttachmentData {
  yaml: string;
  workflowId?: string;
  name?: string;
}

const isWorkflowYamlData = (data: unknown): data is WorkflowYamlAttachmentData => {
  if (!data || typeof data !== 'object' || !('yaml' in data)) {
    return false;
  }

  return typeof data.yaml === 'string' && data.yaml.length > 0;
};

export const resolveAiIndexIdFromAttachments = (
  attachments: Array<{ type: string; data: { id?: string } }>,
  aiIndexId?: string
): string => {
  if (aiIndexId) {
    return aiIndexId;
  }

  const attachment = attachments.find(
    (entry) => entry.type === AI_INDEX_ATTACHMENT_TYPE && typeof entry.data.id === 'string'
  );

  if (!attachment?.data.id) {
    throw new Error(
      'No ai_index attachment found in this conversation. Provide aiIndexId explicitly or attach the AI index first.'
    );
  }

  return attachment.data.id;
};

const flattenAiIndexAttachments = (
  attachments: AttachmentStateManager
): Array<{ type: string; data: { id?: string } }> =>
  attachments.getAll().flatMap((attachment) => {
    const latestVersion = getLatestVersion(attachment);
    if (!latestVersion?.data || typeof latestVersion.data !== 'object') {
      return [];
    }

    return [
      {
        type: attachment.type,
        data: latestVersion.data as { id?: string },
      },
    ];
  });

export const resolveWorkflowYamlFromAttachments = (
  attachments: AttachmentStateManager,
  workflowAttachmentId: string
): { yaml: string; workflowId?: string; origin?: string } => {
  const attachment = attachments.getAll().find((entry) => entry.id === workflowAttachmentId);

  if (!attachment) {
    throw new Error(
      `Workflow attachment '${workflowAttachmentId}' not found in this conversation.`
    );
  }

  if (attachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
    throw new Error(
      `Attachment '${workflowAttachmentId}' is not a workflow attachment (expected ${WORKFLOW_YAML_ATTACHMENT_TYPE}).`
    );
  }

  const latestVersion = getLatestVersion(attachment);
  if (!latestVersion || !isWorkflowYamlData(latestVersion.data)) {
    throw new Error(`Workflow attachment '${workflowAttachmentId}' has no YAML content to save.`);
  }

  return {
    yaml: latestVersion.data.yaml,
    workflowId: latestVersion.data.workflowId,
    origin: attachment.origin,
  };
};

const assertWorkflowExists = async ({
  workflowId,
  spaceId,
  workflowsManagement,
}: {
  workflowId: string;
  spaceId: string;
  workflowsManagement: WorkflowsManagementApi;
}): Promise<void> => {
  const workflow = await workflowsManagement.getWorkflow(workflowId, spaceId);
  if (!workflow) {
    throw new Error(`Workflow '${workflowId}' was not found in this space.`);
  }
};

const attachWorkflowToAiIndex = async ({
  aiIndexId,
  workflowId,
  getAiIndexService,
}: {
  aiIndexId: string;
  workflowId: string;
  getAiIndexService: () => AiIndexService;
}): Promise<'attached' | 'already_attached'> => {
  const aiIndexService = getAiIndexService();
  const aiIndex = await aiIndexService.get(aiIndexId);

  if (aiIndex.managed) {
    throw new AiIndexManagedError(aiIndexId);
  }

  const alreadyAttached = aiIndex.automations.some(
    (automation) => automation.type === 'workflow' && automation.value === workflowId
  );

  if (alreadyAttached) {
    return 'already_attached';
  }

  if (aiIndex.automations.length >= MAX_AI_INDEX_AUTOMATIONS) {
    throw new Error(
      `AI index "${aiIndexId}" already has the maximum number of automations (${MAX_AI_INDEX_AUTOMATIONS}).`
    );
  }

  await aiIndexService.put(aiIndexId, {
    description: aiIndex.description,
    dest: aiIndex.dest,
    sources: aiIndex.sources,
    automations: [...aiIndex.automations, { type: 'workflow', value: workflowId }],
  });

  return 'attached';
};

export const saveAutomationHandler = async ({
  params,
  request,
  spaceId,
  attachments,
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  params: SaveAutomationParams;
  request: KibanaRequest;
  spaceId: string;
  attachments: AttachmentStateManager;
  getAiIndexService: () => AiIndexService;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): Promise<SaveAutomationResult> => {
  await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

  const workflowsManagement = getWorkflowsManagement();
  const aiIndexAttachments = flattenAiIndexAttachments(attachments);
  const aiIndexId = resolveAiIndexIdFromAttachments(aiIndexAttachments, params.aiIndexId);

  if (params.workflowId) {
    await assertWorkflowExists({
      workflowId: params.workflowId,
      spaceId,
      workflowsManagement,
    });

    const attachStatus = await attachWorkflowToAiIndex({
      aiIndexId,
      workflowId: params.workflowId,
      getAiIndexService,
    });

    return {
      aiIndexId,
      workflowId: params.workflowId,
      status: attachStatus,
    };
  }

  if (!params.workflowAttachmentId) {
    throw new Error('Provide either workflowAttachmentId or workflowId.');
  }

  const {
    yaml,
    workflowId: proposedWorkflowId,
    origin,
  } = resolveWorkflowYamlFromAttachments(attachments, params.workflowAttachmentId);

  let savedWorkflowId: string;

  if (origin) {
    savedWorkflowId = origin;
    await workflowsManagement.updateWorkflow(origin, { yaml }, spaceId, request);
  } else {
    const created = await workflowsManagement.createWorkflow(
      { yaml, ...(proposedWorkflowId ? { id: proposedWorkflowId } : {}) },
      spaceId,
      request
    );
    savedWorkflowId = created.id;
    const originUpdated = await attachments.updateOrigin(
      params.workflowAttachmentId,
      savedWorkflowId,
      ATTACHMENT_REF_ACTOR.agent
    );
    if (!originUpdated) {
      throw new Error(
        `Failed to record workflow origin for attachment '${params.workflowAttachmentId}'.`
      );
    }
  }

  const attachStatus = await attachWorkflowToAiIndex({
    aiIndexId,
    workflowId: savedWorkflowId,
    getAiIndexService,
  });

  return {
    aiIndexId,
    workflowId: savedWorkflowId,
    status: attachStatus === 'already_attached' ? 'already_attached' : 'saved_and_attached',
  };
};

const SAVE_AUTOMATION_DOMAIN_ERRORS = [
  AiIndexNotFoundError,
  AiIndexManagedError,
  AiIndexConflictError,
] as const;

const isInternalError = (error: Error): boolean => 'statusCode' in error || 'meta' in error;

export const getSaveAutomationErrorMessage = (error: unknown): string => {
  if (SAVE_AUTOMATION_DOMAIN_ERRORS.some((ErrorType) => error instanceof ErrorType)) {
    return (error as Error).message;
  }

  if (error instanceof Error) {
    if (isInternalError(error)) {
      return 'An unexpected error occurred while saving the workflow automation.';
    }

    return error.message;
  }

  return 'An unexpected error occurred while saving the workflow automation.';
};
