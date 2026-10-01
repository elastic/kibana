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
  renderTargetedKiWriterTemplate,
  renderUnitProfileTemplate,
  type AutomationTemplateId,
  type DocumentOrchestrationTemplateValues,
  type IndexMetadataTemplateValues,
  type TargetedKiWriterTemplateValues,
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
      'aiIndexId'
    > &
      WithName)
  | ({ template: 'index_metadata' } & Omit<IndexMetadataTemplateValues, 'aiIndexId'> & WithName)
  | ({ template: 'unit_profile' } & Omit<UnitProfileTemplateValues, 'aiIndexId'> & WithName)
  | ({ template: 'targeted_ki_writer' } & Omit<TargetedKiWriterTemplateValues, 'aiIndexId'> &
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
    return renderDocumentOrchestrationTemplate({ ...params, aiIndexId, automationName: params.name });
  }
  if (params.template === 'unit_profile') {
    return renderUnitProfileTemplate({ ...params, aiIndexId, automationName: params.name });
  }
  if (params.template === 'targeted_ki_writer') {
    return renderTargetedKiWriterTemplate({ aiIndexId, kis: params.kis });
  }
  return renderIndexMetadataTemplate({ ...params, aiIndexId, automationName: params.name });
};

/**
 * The workflow this template already attached to the AI index, if one exists.
 * A tag match wins; a matching workflow name covers a copy saved before the tag existed.
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
  let nameMatch: string | undefined;

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
    // matching only. A tag match without a name match would overwrite a differently-named
    // automation of the same template type, which is the opposite of the multi-instance intent.
    // The tag path is retained only for callers that supply no name (pre-name backwards compat).
    if (templateName) {
      if (workflow.name === templateName) {
        // Guard against cross-template name collisions: a workflow carrying a different
        // template's tag cannot be a valid replacement target for this template type.
        const hasOtherTemplateTag = Object.values(AUTOMATION_TEMPLATE_TAGS).some(
          (tag) => tag !== templateTag && workflow.tags?.includes(tag)
        );
        if (!hasOtherTemplateTag && nameMatch === undefined) {
          nameMatch = workflow.id ?? automation.value;
        }
      }
    } else if (workflow.tags?.includes(templateTag) && nameMatch === undefined) {
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
