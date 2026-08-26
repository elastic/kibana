/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENT_REF_ACTOR, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  hasWorkflowCreatePrivilege,
  hasWorkflowReadPrivilege,
  hasWorkflowUpdatePrivilege,
} from '@kbn/agent-builder-tools-base/workflows';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import {
  AI_INDEX_ATTACHMENT_TYPE,
  WORKFLOW_YAML_ATTACHMENT_TYPE,
} from '../../../../common/agent_builder_attachments';
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

export const parseWorkflowNameFromYaml = (yaml: string): string | undefined => {
  const parsed = parseYamlToJSONWithoutValidation(yaml);
  if (!parsed.success || parsed.json == null || typeof parsed.json !== 'object') {
    return undefined;
  }

  const name = (parsed.json as Record<string, unknown>).name;
  return typeof name === 'string' && name.trim() !== '' ? name : undefined;
};

export const tryResolveWorkflowDisplayNameFromAttachments = (
  attachments: AttachmentStateManager | undefined,
  workflowAttachmentId: string
): string | undefined => {
  if (!attachments) {
    return undefined;
  }

  const attachment = attachments.getAll().find((entry) => entry.id === workflowAttachmentId);
  if (!attachment || attachment.type !== WORKFLOW_YAML_ATTACHMENT_TYPE) {
    return undefined;
  }

  const latestVersion = getLatestVersion(attachment);
  if (!latestVersion || !isWorkflowYamlData(latestVersion.data)) {
    return undefined;
  }

  return latestVersion.data.name ?? parseWorkflowNameFromYaml(latestVersion.data.yaml);
};

export const tryResolveAiIndexDisplayLabelFromAttachments = (
  attachments: AttachmentStateManager | undefined,
  aiIndexId?: string
): string => {
  if (!attachments) {
    return aiIndexId ?? 'the AI index';
  }

  for (const attachment of attachments.getAll()) {
    if (attachment.type !== AI_INDEX_ATTACHMENT_TYPE) {
      continue;
    }

    const latestVersion = getLatestVersion(attachment);
    const data = latestVersion?.data;
    if (!data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string') {
      continue;
    }

    if (aiIndexId !== undefined && data.id !== aiIndexId) {
      continue;
    }

    if (
      'description' in data &&
      typeof data.description === 'string' &&
      data.description.length > 0
    ) {
      return data.description;
    }

    return data.id;
  }

  return aiIndexId ?? 'the AI index';
};

export const tryResolveWorkflowDisplayNameById = async ({
  workflowsManagement,
  workflowId,
  spaceId,
}: {
  workflowsManagement: WorkflowsManagementApi;
  workflowId: string;
  spaceId: string;
}): Promise<string | undefined> => {
  try {
    const workflow = await workflowsManagement.getWorkflow(workflowId, spaceId);
    return workflow?.name;
  } catch {
    return undefined;
  }
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

const assertWorkflowReadAccess = async ({
  workflowId,
  spaceId,
  request,
  getSecurityStart,
  workflowsManagement,
}: {
  workflowId: string;
  spaceId: string;
  request: KibanaRequest;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  workflowsManagement: WorkflowsManagementApi;
}): Promise<void> => {
  const security = await getSecurityStart();
  const canRead = await hasWorkflowReadPrivilege({ security, request, spaceId });
  if (!canRead) {
    throw new Error(
      `Unauthorized to reference workflow '${workflowId}'. The workflowsManagement read privilege is required.`
    );
  }

  const workflow = await workflowsManagement.getWorkflow(workflowId, spaceId);
  if (!workflow) {
    throw new Error(`Workflow '${workflowId}' was not found in this space.`);
  }
};

const assertWorkflowCreateAccess = async ({
  spaceId,
  request,
  getSecurityStart,
}: {
  spaceId: string;
  request: KibanaRequest;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): Promise<void> => {
  const security = await getSecurityStart();
  const canCreate = await hasWorkflowCreatePrivilege({ security, request, spaceId });
  if (!canCreate) {
    throw new Error(
      'Unauthorized to create a workflow. The workflowsManagement create privilege is required.'
    );
  }
};

const assertWorkflowUpdateAccess = async ({
  workflowId,
  spaceId,
  request,
  getSecurityStart,
}: {
  workflowId: string;
  spaceId: string;
  request: KibanaRequest;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): Promise<void> => {
  const security = await getSecurityStart();
  const canUpdate = await hasWorkflowUpdatePrivilege({ security, request, spaceId });
  if (!canUpdate) {
    throw new Error(
      `Unauthorized to update workflow '${workflowId}'. The workflowsManagement update privilege is required.`
    );
  }
};

const persistWorkflowFromAttachment = async ({
  yaml,
  proposedWorkflowId,
  existingWorkflowId,
  workflowsManagement,
  spaceId,
  request,
  getSecurityStart,
}: {
  yaml: string;
  proposedWorkflowId?: string;
  existingWorkflowId?: string;
  workflowsManagement: WorkflowsManagementApi;
  spaceId: string;
  request: KibanaRequest;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): Promise<{ workflowId: string; newlyCreated: boolean }> => {
  if (existingWorkflowId !== undefined) {
    await assertWorkflowUpdateAccess({
      workflowId: existingWorkflowId,
      spaceId,
      request,
      getSecurityStart,
    });
    await workflowsManagement.updateWorkflow(existingWorkflowId, { yaml }, spaceId, request);
    return { workflowId: existingWorkflowId, newlyCreated: false };
  }

  await assertWorkflowCreateAccess({ spaceId, request, getSecurityStart });
  const created = await workflowsManagement.createWorkflow(
    { yaml, ...(proposedWorkflowId ? { id: proposedWorkflowId } : {}) },
    spaceId,
    request
  );

  return { workflowId: created.id, newlyCreated: true };
};

export const saveAutomationHandler = async ({
  params,
  request,
  spaceId,
  attachments,
  logger,
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  params: SaveAutomationParams;
  request: KibanaRequest;
  spaceId: string;
  attachments: AttachmentStateManager;
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): Promise<SaveAutomationResult> => {
  await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

  const workflowsManagement = getWorkflowsManagement();
  const aiIndexAttachments = flattenAiIndexAttachments(attachments);
  const aiIndexId = resolveAiIndexIdFromAttachments(aiIndexAttachments, params.aiIndexId);
  const aiIndexService = await getAiIndexService();

  if (params.workflowId) {
    await assertWorkflowReadAccess({
      workflowId: params.workflowId,
      spaceId,
      request,
      getSecurityStart,
      workflowsManagement,
    });

    // Fail-fast: reject before attach when the index cannot accept this automation.
    await aiIndexService.assertCanAcceptAutomation(aiIndexId, {
      type: 'workflow',
      value: params.workflowId,
    });

    const attachStatus = await aiIndexService.addAutomation(aiIndexId, {
      type: 'workflow',
      value: params.workflowId,
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
    origin: existingWorkflowId,
  } = resolveWorkflowYamlFromAttachments(attachments, params.workflowAttachmentId);
  const isUpdate = existingWorkflowId !== undefined;

  // Fail-fast: reject before createWorkflow/updateWorkflow when the index cannot accept this automation.
  await aiIndexService.assertCanAcceptAutomation(
    aiIndexId,
    existingWorkflowId ? { type: 'workflow', value: existingWorkflowId } : undefined
  );

  const { workflowId, newlyCreated } = await persistWorkflowFromAttachment({
    yaml,
    proposedWorkflowId,
    existingWorkflowId,
    workflowsManagement,
    spaceId,
    request,
    getSecurityStart,
  });

  try {
    const attachStatus = await aiIndexService.addAutomation(aiIndexId, {
      type: 'workflow',
      value: workflowId,
    });

    if (newlyCreated) {
      const originUpdated = await attachments.updateOrigin(
        params.workflowAttachmentId,
        workflowId,
        ATTACHMENT_REF_ACTOR.agent
      );
      if (!originUpdated) {
        logger.warn(
          `Workflow '${workflowId}' was attached but its attachment origin could not be recorded; ` +
            `a future save for attachment '${params.workflowAttachmentId}' may create a duplicate workflow.`
        );
      }
    }

    return {
      aiIndexId,
      workflowId,
      status: isUpdate || attachStatus === 'attached' ? 'saved_and_attached' : 'already_attached',
    };
  } catch (error) {
    if (newlyCreated) {
      try {
        await workflowsManagement.deleteWorkflows([workflowId], spaceId, request);
      } catch (deleteError) {
        logger.warn(`Failed to roll back workflow '${workflowId}' after attach failure`, {
          error: deleteError,
        });
      }
    }

    throw error;
  }
};

export const getSaveAutomationErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred while saving the workflow automation.';
};
