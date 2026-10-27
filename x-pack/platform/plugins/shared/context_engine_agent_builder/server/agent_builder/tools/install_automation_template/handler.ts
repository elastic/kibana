/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
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
  renderMemoryCustomExtractionTemplate,
  renderMemoryDistillationTemplate,
  renderMemoryExtractionTemplate,
  renderMemoryMaintenanceTemplate,
  renderMemoryPromotionTemplate,
  renderTargetedKiWriterTemplate,
  renderTraceMemoryExtractionTemplate,
  renderUnitProfileTemplate,
  type AutomationTemplateId,
  type DocumentOrchestrationTemplateValues,
  type IndexMetadataTemplateValues,
  type MemoryCustomExtractionTemplateValues,
  type MemoryDistillationTemplateValues,
  type MemoryExtractionTemplateValues,
  type MemoryMaintenanceTemplateValues,
  type MemoryPromotionTemplateValues,
  type TargetedKiWriterTemplateValues,
  type TraceMemoryExtractionTemplateValues,
  type UnitProfileTemplateValues,
} from './render';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface WithName {
  /** Human-readable name scoped to the AI index. Used for name-based lookup and injected as the workflow name. */
  name: string;
}

export type InstallAutomationTemplateParams =
  | ({ template: 'document_orchestration' } & Omit<
      DocumentOrchestrationTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'index_metadata' } & Omit<
      IndexMetadataTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'unit_profile' } & Omit<
      UnitProfileTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'targeted_ki_writer' } & Omit<TargetedKiWriterTemplateValues, 'aiIndexId'> &
      WithName)
  | ({ template: 'memory_promotion' } & Omit<
      MemoryPromotionTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'trace_memory_extraction' } & Omit<
      TraceMemoryExtractionTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'memory_distillation' } & Omit<
      MemoryDistillationTemplateValues,
      'aiIndexId' | 'automationName'
    > &
      WithName)
  | ({ template: 'memory_extraction' } & Omit<MemoryExtractionTemplateValues, 'aiIndexId'> &
      WithName)
  | ({ template: 'memory_custom_extraction' } & Omit<
      MemoryCustomExtractionTemplateValues,
      'aiIndexId'
    > &
      WithName)
  | ({ template: 'memory_maintenance' } & Omit<MemoryMaintenanceTemplateValues, 'aiIndexId'> &
      WithName);

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
    return renderDocumentOrchestrationTemplate({
      ...params,
      aiIndexId,
      automationName: params.name,
    });
  }
  if (params.template === 'unit_profile') {
    return renderUnitProfileTemplate({ ...params, aiIndexId, automationName: params.name });
  }
  if (params.template === 'targeted_ki_writer') {
    return renderTargetedKiWriterTemplate({ aiIndexId, kis: params.kis });
  }
  if (params.template === 'memory_promotion') {
    return renderMemoryPromotionTemplate({ ...params, aiIndexId, automationName: params.name });
  }
  if (params.template === 'trace_memory_extraction') {
    return renderTraceMemoryExtractionTemplate({
      ...params,
      aiIndexId,
      automationName: params.name,
    });
  }
  if (params.template === 'memory_distillation') {
    return renderMemoryDistillationTemplate({ ...params, aiIndexId, automationName: params.name });
  }
  if (params.template === 'memory_extraction') {
    return renderMemoryExtractionTemplate({ ...params, aiIndexId });
  }
  if (params.template === 'memory_custom_extraction') {
    return renderMemoryCustomExtractionTemplate({ ...params, aiIndexId });
  }
  if (params.template === 'memory_maintenance') {
    // Short-term memories live in the Elastic AI index whichever index this is attached to.
    if (aiIndexId !== agentBuilderDefaultAiIndexId) {
      throw new Error(
        `memory_maintenance maintains short-term memory, which lives in the "${agentBuilderDefaultAiIndexId}" AI index. Attach that AI index and install it there.`
      );
    }
    return renderMemoryMaintenanceTemplate({ ...params, aiIndexId });
  }
  return renderIndexMetadataTemplate({ ...params, aiIndexId, automationName: params.name });
};

/**
 * The automation on the AI index with exactly the requested name, if one exists. A workflow tagged
 * as a different template is never matched, so one template cannot overwrite another.
 */
export const findInstalledTemplateWorkflowId = async ({
  aiIndexId,
  spaceId,
  request,
  template,
  workflowYaml,
  logger,
  getAiIndexService,
  getWorkflowsManagement,
}: {
  aiIndexId: string;
  spaceId: string;
  request: KibanaRequest;
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

  for (const automation of aiIndex.automations) {
    if (automation.type !== 'workflow') {
      continue;
    }

    let workflow: { id?: string; name?: string; tags?: string[] } | null | undefined;
    try {
      workflow = await workflowsManagement.getWorkflow(automation.value, spaceId, request);
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

    // When a name is provided (always the case now that name is mandatory) use exact name
    // Name is mandatory and always injected into the YAML, so templateName is always defined.
    // Matching is by exact name only. A workflow carrying a different template's tag is skipped
    // to prevent cross-template overwrites. Return immediately on match so later unrelated
    // workflow reads cannot block an already-found replacement target.
    if (workflow.name === templateName) {
      const hasOtherTemplateTag = Object.values(AUTOMATION_TEMPLATE_TAGS).some(
        (tag) => tag !== templateTag && workflow.tags?.includes(tag)
      );
      if (!hasOtherTemplateTag) {
        return workflow.id ?? automation.value;
      }
    }
  }

  return undefined;
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
  // Inject the caller-provided name into the rendered YAML so the server derives a stable
  // workflow ID from it, keeping workflow IDs scoped to names rather than AI index ids.
  // NOTE: changing `name` on an existing automation changes its ki_ids (they are prefixed with
  // automation_name). KIs produced under the old name are not cleaned up automatically; callers
  // that need to migrate must delete stale KIs out of band before or after re-running.
  const workflowYaml = renderTemplate(params, aiIndexId).replace(
    /^name: .*/m,
    `name: ${JSON.stringify(params.name)}`
  );

  const existingWorkflowId = await findInstalledTemplateWorkflowId({
    aiIndexId,
    spaceId,
    request,
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
