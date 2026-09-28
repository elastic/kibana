/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import {
  parseWorkflowNameFromYaml,
  resolveAiIndexIdFromAttachments,
  saveAutomationHandler,
  type SaveAutomationResult,
} from '../save_automation/handler';

export interface InstallAutomationTemplateResult extends SaveAutomationResult {
  /** True when an automation already attached to the AI index was overwritten. */
  replaced: boolean;
}
import {
  AUTOMATION_TEMPLATE_TAGS,
  renderDocumentOrchestrationTemplate,
  renderIndexMetadataTemplate,
  renderUnitProfileTemplate,
  type AutomationTemplateId,
  type DocumentOrchestrationTemplateValues,
  type IndexMetadataTemplateValues,
  type UnitProfileTemplateValues,
} from './render';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export type InstallAutomationTemplateParams =
  | ({ template: 'document_orchestration' } & Omit<
      DocumentOrchestrationTemplateValues,
      'aiIndexId'
    >)
  | ({ template: 'index_metadata' } & Omit<IndexMetadataTemplateValues, 'aiIndexId'>)
  | ({ template: 'unit_profile' } & Omit<UnitProfileTemplateValues, 'aiIndexId'>);

const aiIndexIdFromAttachments = (attachments: AttachmentStateManager): string => {
  try {
    return resolveAiIndexIdFromAttachments(
      attachments.getAll().flatMap((attachment) => {
        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion?.data || typeof latestVersion.data !== 'object') {
          return [];
        }

        return [{ type: attachment.type, data: latestVersion.data as { id?: string } }];
      })
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No ai_index attachment')) {
      throw new Error(
        'No ai_index attachment found in this conversation. Attach the AI index first. This tool does not take an aiIndexId.'
      );
    }
    throw error;
  }
};

const renderTemplate = (params: InstallAutomationTemplateParams, aiIndexId: string): string => {
  if (params.template === 'document_orchestration') {
    return renderDocumentOrchestrationTemplate({ ...params, aiIndexId });
  }
  if (params.template === 'unit_profile') {
    return renderUnitProfileTemplate({ ...params, aiIndexId });
  }
  return renderIndexMetadataTemplate({ ...params, aiIndexId });
};

/**
 * The workflow this template already attached to the AI index, if one exists.
 * A tag match wins; a matching workflow name covers a copy saved before the tag existed.
 */
export const findInstalledTemplateWorkflowId = async ({
  aiIndexId,
  spaceId,
  template,
  workflowYaml,
  logger,
  getAiIndexService,
  getWorkflowsManagement,
}: {
  aiIndexId: string;
  spaceId: string;
  template: AutomationTemplateId;
  workflowYaml: string;
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): Promise<string | undefined> => {
  const aiIndex = await (await getAiIndexService()).get(aiIndexId, spaceId);
  const workflowsManagement = getWorkflowsManagement();
  const templateTag = AUTOMATION_TEMPLATE_TAGS[template];
  const templateName = parseWorkflowNameFromYaml(workflowYaml);
  let nameMatch: string | undefined;

  for (const automation of aiIndex.automations) {
    if (automation.type !== 'workflow') {
      continue;
    }

    let workflow: { id?: string; name?: string; tags?: string[] } | null | undefined;
    try {
      workflow = await workflowsManagement.getWorkflow(automation.value, spaceId);
    } catch (error) {
      // A failed read is not "not installed". Creating here would attach a second copy.
      logger.error(
        `Failed to read workflow "${automation.value}" while installing ${template}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }

    if (!workflow) {
      continue;
    }

    if (workflow.tags?.includes(templateTag)) {
      return workflow.id ?? automation.value;
    }

    if (templateName && workflow.name === templateName && nameMatch === undefined) {
      nameMatch = workflow.id ?? automation.value;
    }
  }

  return nameMatch;
};

export const installAutomationTemplateHandler = async ({
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
  params: InstallAutomationTemplateParams;
  request: KibanaRequest;
  spaceId: string;
  attachments: AttachmentStateManager;
  logger: Logger;
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): Promise<InstallAutomationTemplateResult> => {
  await assertContextEngineWriteAccess({ request, spaceId, getCoreStart, getSecurityStart });

  const aiIndexId = aiIndexIdFromAttachments(attachments);
  const workflowYaml = renderTemplate(params, aiIndexId);
  const existingWorkflowId = await findInstalledTemplateWorkflowId({
    aiIndexId,
    spaceId,
    template: params.template,
    workflowYaml,
    logger,
    getAiIndexService,
    getWorkflowsManagement,
  });

  const result = await saveAutomationHandler({
    params: {
      workflowYaml,
      aiIndexId,
      ...(existingWorkflowId ? { workflowId: existingWorkflowId } : {}),
    },
    request,
    spaceId,
    attachments,
    logger,
    getAiIndexService,
    getCoreStart,
    getSecurityStart,
    getWorkflowsManagement,
  });

  return { ...result, replaced: existingWorkflowId !== undefined };
};
